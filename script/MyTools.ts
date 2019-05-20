import * as fs from "fs-extra";
import * as archiver from "archiver"
import * as unzipper from 'unzipper'

import * as crypto from 'crypto'
import * as path from 'path'
import * as  child_process from 'child_process'

let SEP = path.sep

export class myTools {

    //生成uuid
    static uuid() {
        let s = [];
        let hexDigits = "0123456789abcdef";
        for (let i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((parseInt(s[19]) & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        let uuid = s.join("");
        return uuid;
    }

    //删除文件或者目录
    static deleteFileOrDirSync(path: string) {
        let isFile = fs.statSync(path).isFile()
        if (isFile) {
            this.deleteFileSync(path)
        } else {
            this.deleteDirSync(path)
        }
    }

    //删除文件
    static deleteFileSync(path: string) {
        if (fs.existsSync(path) && fs.statSync(path).isFile()) {
            fs.unlinkSync(path)
        }
    }

    //删目录
    static deleteDirSync(path: string) {
        let files = []
        if (fs.existsSync(path)) {
            files = fs.readdirSync(path)
            files.forEach((file, index) => {
                let curPath = path + '\\' + file
                if (fs.statSync(curPath).isDirectory()) {
                    this.deleteDirSync(curPath) //是目录递归删除
                } else {
                    fs.unlinkSync(curPath) //是文件直接删除
                }
            })
            fs.rmdirSync(path) //删除空目录
        }
    }

    //文件移动
    static moveFileSync(oldPath: string, newPath: string) {
        fs.renameSync(oldPath, newPath)
    }
    // /**
    //  * 解压zip
    //  * @param zipPath 
    //  * @param outputPath 解压到的目录 名字用压缩时的名字
    //  * @param cb 
    //  */
    static unZip(zipPath: string, outputPath: string, cb: () => void) {
        // let uz = unzip.Extract({ path: outputPath })
        // let input = fs.createReadStream(zipPath)
        // input.pipe(uz)
        // input.on('close', () => {
        //     console.log('解压完成')
        //     cb()
        // })
        //console.log('resultPipe',resultPipe)
        fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: outputPath }))
            .promise()
            .then(
                () => {
                    console.log('resolve')
                    cb()
                },
                (e) => {
                    console.error(e)
                }
            )
    }
    //zip 压缩不创建二级目录
    static archiverZipNoSubRoot(resPath: string, outputPath: string) {
        return new Promise((resolve, reject) => {
            let output = fs.createWriteStream(outputPath)
            let myArchiever = archiver.create('zip')
            output.on('close', () => {
                console.log('压缩完成')
                return resolve()
            })
            myArchiever.on('error', (err) => {
                console.error('压缩失败', err)
                return reject()
            })
            myArchiever.pipe(output)
            myArchiever.directory(resPath, false)
            myArchiever.finalize()
        })

    }
    // //压缩zip
    static archiverZip(resPath: string, outputPath: string) {
        return new Promise((resolve, reject) => {
            let output = fs.createWriteStream(outputPath)
            let myArchiever = archiver.create('zip')
            output.on('close', () => {
                console.log('压缩完成')
                return resolve()
            })
            myArchiever.on('error', (err) => {
                console.error('压缩失败', err)
                return reject()
            })
            myArchiever.pipe(output)
            myArchiever.directory(resPath, path.basename(resPath))
            myArchiever.finalize()
        })
    }
    //获取文件后缀名
    static getExtension(path: string) {
        let arr = path.split('.')
        return arr[arr.length - 1]
    }

    //文件去后缀名
    static cutExtension(fileName: string) {
        return fileName.split('.')[0]
    }

    static findFromArr(arr: any[], target: any) {
        for (let i = 0; i < arr.length; i++) {
            const element = arr[i];
            if (element == target) {
                return true
            }
        }
        return false
    }


    //目录名
    static getDirName(dirPath: string) {
        let arr = dirPath.split(SEP)
        return arr[arr.length - 1]
    }
    /**
     * //从路径中获取文件名 
     * @param path 文件路径
     * @param isCutExten 是否去后缀名
     */
    static getFileName(path: string, isCutExten: boolean = false) {
        let arr = path.split(SEP)
        let last = arr[arr.length - 1]
        if (isCutExten) {
            return this.cutExtension(last)
        }
        return last
    }

    static getMd5(filePath: string, finishCb: (md5Str: string) => void) {
        let md5 = crypto.createHash('md5');
        console.log('getMd5:', filePath)
        let rStream = fs.createReadStream(filePath)
        rStream.on('data', (chunk) => {
            md5.update(chunk)
        })
        rStream.on('end', function () {
            let str = md5.digest('hex').toUpperCase();
            finishCb(str)
        });
    }

    static getMd5Sync(filePath: string) {
        let md5 = crypto.createHash('md5');
        let buf = fs.readFileSync(filePath)
        md5.update(buf)
        let md5Str = md5.digest('hex').toUpperCase();
        return md5Str
    }


    //求文件夹的md5值
    /**
     * 各文件md5值存map中对map排序然后取md5
     */
    static getMd5_dir(dirPath: string, finishCb: (md5Str: string) => void) {
        let md5 = crypto.createHash('md5')
        if (fs.statSync(dirPath).isDirectory()) {
            let files = fs.readdirSync(dirPath)
            for (const file of files) {

            }
        } else {
            console.error('getMd5_dir dirPath不是一个目录')
        }
    }

    /**
     * 深拷贝
     * @param obj 
     */
    static copyObject(obj: Object) {
        let obj_json = JSON.stringify(obj)
        return JSON.parse(obj_json)
    }

    /**
     * 获得父目录
     * @param dirPath 路径中的分隔符'\' 必须是path.sep 或者windows下使用'\\'转义
     */
    static getParentRoot(dirPath: string) {
        let tempArr = dirPath.split(SEP)
        tempArr.pop()
        return tempArr.join(SEP)
    }

    /**
     * 使用windows zip
     * @param input 
     * @param output 
     */
    static zipByWinZip(input: string, output: string) {
        let opeationPath = this.getParentRoot(output)
        input = input.split(SEP).pop()
        output = output.split(SEP).pop()
        console.log('zip input:', input)
        console.log('zip output:', output)
        console.log('zip opeationPath', opeationPath)
        return new Promise((resolve, reject) => {
            let args = [
                //'/C',  //在C 盘下压缩 压缩目录会从 Users/Administrator/Desktop/ 开始
                //'zip',
                '-X',
                '-r',
                '-S',
                `${output}`,
                `${input}`
            ]
            console.log('zip ' + args.join(' '), 'pwd:', opeationPath)
            let child = child_process.spawn('zip', args, { cwd: opeationPath, shell: true })
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);

            child.on('error', err => {
                console.error(err)
                reject(err)
            })
            child.on('exit', code => {
                //console.log('exit', code)
                if (code == 0) {
                    console.log('压缩成功')
                    resolve();
                } else {
                    reject(new Error('压缩失败'))
                }
            })
        })
    }

    /**
     * unzip压缩 需要装unzip  解压到同级目录
     * @param input 
     */
    static unzipByWinUnzip(input: string, outputPath: string) {
        //let opeationPath = this.getParentRoot(input)
        //input = input.split(SEP).pop()
        console.log('unzip input:', input)
        console.log('unzip opeationPath', outputPath)
        // let outpathDir = `${opeationPath}${SEP}${this.getFileName(input, true)}`
        return new Promise((resolve, reject) => {
            let args = [
                '-o',
                `${input}`
            ]
            console.log('unzip ' + args.join(' '), 'pwd:', outputPath)
            let child = child_process.spawn('unzip', args, { cwd: outputPath, shell: true })
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);

            child.on('error', err => {
                console.error(err)
                reject(err)
            })
            child.on('exit', code => {
                //console.log('exit', code)
                if (code == 0) {
                    console.log('解压成功')
                    resolve();
                } else {
                    reject(new Error(`解压压缩失败 code:${code}`))
                }
            })
        })
    }






}


