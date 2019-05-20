import * as path from 'path'
import { myTools } from './script/MyTools';
import * as fs from "fs-extra";
import * as  child_process from 'child_process'

/*********************************** Android 重签名 ****************************/



const RES_MAP = {
    ['resDir']: `${__dirname}${path.sep}res`,
    ['keyDir']: `${__dirname}${path.sep}keyDir`, //key存放路径
    ['unpackageDir']: `${__dirname}${path.sep}unpackage`,//apk解压后的目录
    ['outputDir']: `${__dirname}${path.sep}output`, //重签名后的apk 输出路径 
    ['noSignPackageDir']: `${__dirname}${path.sep}noSignPackage`,//未签名包目录 
}

//使用是替换路径  
let apkPath = `${RES_MAP.resDir}${path.sep}wanhui.apk` //要重新签名的apk路径 (自定义) 
let apkName = path.basename(apkPath, '.apk')
let keystorePath = `${RES_MAP.keyDir}${path.sep}androidPackageKey.jks` //重新签名所需要的key路径 (自定义)
let keystorePassword = 123456 //keystore密码 (自定义)
let keyAlias = 'key0' //keyAlias 别名 (自定义)
let keypassPassword = 123456 //key密码 (自定义)
let resignedjarPath = `${RES_MAP.outputDir}${path.sep}signed_${apkName}.apk`//重新签名后的apk路径 (自定义)

const META_INF = 'META-INF'


//reSignPackage()
/**
 * 重签名
 */
function reSignPackage() {

    console.log('apkName:', apkName)
    let unpackagePath = `${RES_MAP.unpackageDir}${path.sep}${apkName}`
    let noSignPackagePath_zip = `${RES_MAP.noSignPackageDir}${path.sep}noSign_${apkName}.zip`
    let noSignPackagePath_apk = `${RES_MAP.noSignPackageDir}${path.sep}noSign_${apkName}.apk`

    //解压apk 
    unpackagePath = `${RES_MAP.resDir}${path.sep}${apkName}`
    if (fs.existsSync(unpackagePath)) {
        myTools.deleteFileOrDirSync(unpackagePath)
    }
    fs.mkdirSync(unpackagePath)
    myTools.unzipByWinUnzip(apkPath, unpackagePath)
        .then(() => {
            //删除META-INF 目录
            let metePath = `${unpackagePath}${path.sep}${META_INF}`
            if (!fs.existsSync(metePath)) {
                console.warn('META-INF 目录不存在')
            } else {
                myTools.deleteFileOrDirSync(metePath)
                console.log('删除META-INF目录成功')
            }
            //重新打包成apk 此时包中没有 META-INF 目录
            return myTools.archiverZipNoSubRoot(unpackagePath, noSignPackagePath_apk)
        })
        .then(() => {
            //重新签名
            return reSign(noSignPackagePath_apk)
        })
}
/**
 * jarsigner -verbose -keystore debug.keystore -storepass android -keypass android -signedjar Thinkdrive_signed.apk  Thinkdrive_temp.apk androiddebugkey
 * 
    解释： jarsigner是Java的签名工具

    -verbose参数表示：显示出签名详细信息

    -keystore表示使用当前目录中的debug.keystore签名证书文件。

    -storepass 密钥口令 

    -signedjar ThinkDrive_signed.apk表示签名后生成的APK名称，

    ThinkDrive_temp.apk 表示未签名的APK，

    androiddebugkey表示debug.keystore的别名

    eg:jarsigner -verbose -keystore C:\Users\Administrator\Desktop\androidPackageKey.jks -storepass 123456 -keypass 123456 -signedjar reSigned_wxShare.apk re.apk key0
*/

/*

/**
 * 重签名命令
 * @param noSignPackagePath_apk 未签名包路径
 */
function reSign(noSignPackagePath_apk: string): Promise<{}> {
    return new Promise((resolve, reject) => {
        let args = [
            '/C',
            'jarsigner',
            '-verbose',
            '-keystore',
            `${keystorePath}`,
            '-storepass',
            `${keystorePassword}`,
            '-keypass',
            `${keypassPassword}`,
            '-signedjar',
            `${resignedjarPath}`,
            `${noSignPackagePath_apk}`,
            `${keyAlias}`
        ]
        console.log('要执行的命令:  cmd' + args.join(' '))
        let child = child_process.spawn('cmd', args)
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);

        child.on('error', err => {
            console.error(err)
            reject(err)
        })
        child.on('exit', code => {
            //console.log('exit', code)
            if (code == 0) {
                console.log('重签名成功')
                resolve();
            } else {
                reject(new Error('重签名失败'))
            }
        })
    })
}


/************************************ 改包名 ********************************** */
/**流程:
       1.解包 apktool_d
       2.替换AndroidManifest.xml 中的包名信息
       3.全局修改smali文件中包引用信息
       4.重命名smali目录 
       5.重新打包 apktool_b
       6.重新签名 
 */

reNamePackage(`${RES_MAP.resDir}${path.sep}wanhui.apk`, 'com.mxr.wh')
/**
 * 改包名 
 * @param newPackage 新包名
 */
function reNamePackage(apkPath, newPackage: string) {
    //使用apktool解压apk  
    apktool_d(apkPath, (err, unPackagePath: string) => {
        if (err) return
        //修改 AndroidManifest
        modificationAndroidManifest_xml(unPackagePath, newPackage, (oldPackage: string) => {
            //TODO: 暂不需要修改文件 只改AndroidManifest 文件下的包名
            //全局修改smali文件中包引用信息
            //allSmaliFileReplacePackageInfoSync(unPackagePath, oldPackage, newPackage)
            //重名名包名
            //modificationSmaliDirSync(unPackagePath, oldPackage, newPackage)
            //重新打包 apktool_b
            apktool_b(unPackagePath, (err, packagePath: string) => {
                if (err) return
                reSign(packagePath).then(() => {
                    console.log('改包名成功')
                })
            })
        })

        //重新签名 
    })
}

/**
 * 修改smali目录内容
 * @param oldPackage 旧包名
 * @param newPackage 新的包名
 */
function modificationSmaliDirSync(unPackagePath: string, oldPackage: string, newPackage: string) {
    return new Promise((resolve, reject) => {
        let oldPackageArr = oldPackage.split('.')
        let newPackageArr = newPackage.split('.')
        if (oldPackageArr.length != newPackageArr.length) {
            console.error('暂不支持目录包层级不同的更改情况!', newPackage, oldPackage)
            return reject()
        }
        //筛选出所以 smali文件 可能有多个
        let smaliDirArr = fs.readdirSync(unPackagePath).filter(v => {
            return (v.indexOf('smali') != -1 && fs.statSync(`${unPackagePath}${path.sep}${v}`).isDirectory())
        })
        console.log(smaliDirArr)
        for (let oneDir of smaliDirArr) {
            let oneDirPath = `${unPackagePath}${path.sep}${oneDir}`
            let oldPath = oneDirPath
            let newPath = oneDirPath
            //更新目录深度
            let reOldPath: string[] = []
            let reNewPath: string[] = []
            for (let deep = 0; deep < oldPackageArr.length; deep++) {
                oldPath += `${path.sep}${oldPackageArr[deep]}`
                newPath += `${path.sep}${newPackageArr[deep]}`
                if (oldPath != newPath) {
                    let oldPath_clone = oldPath
                    let tmepArr = oldPath_clone.split(path.sep)
                    tmepArr.pop()
                    let oldPath_head = tmepArr.join(path.sep)
                    newPath = `${oldPath_head}${path.sep}${newPackageArr[deep]}`
                    //console.log('oldPath_head:', oldPath_head)
                    //console.log('oldPath:', oldPath)
                    //console.log('newPath:', newPath)
                    reOldPath.unshift(oldPath)
                    reNewPath.unshift(newPath)
                }
            }
            //目录重命名 应该先从子目录重命名到再到父目录重命名
            for (let i = 0; i < reOldPath.length; i++) {
                let reO = reOldPath[i];
                let reN = reNewPath[i];
                //console.log('执行rename', reO, reN)
                fs.renameSync(reO, reN)
            }
        }
        console.log('Smali目录文件重命名完成')
        return resolve()
    })
}



/**
 * 修改AndroidManifest.xml
 * @param unPackagePath 解包后包路径
 * @param newPackage 新的包名
 * @param finishCb :(oldPackage: string) => void   oldPackage旧包名
 */
function modificationAndroidManifest_xml(unPackagePath: string, newPackage: string, finishCb: (oldPackage: string) => void) {
    return new Promise((resolve, reject) => {
        const AndroidManifest = `AndroidManifest.xml`
        let AndroidManifest_path = `${unPackagePath}/${AndroidManifest}`
        if (!fs.existsSync(AndroidManifest_path)) {
            console.error(`${AndroidManifest}文件存在!`)
            return reject()
        }
        let content = fs.readFileSync(AndroidManifest_path, { encoding: 'utf8', flag: 'r' })
        // console.log('AndroidManifest.xml content:', content)
        //找package字段位置
        let packageIndex = content.indexOf('package="')
        console.log('packageIndex', packageIndex)
        if (packageIndex == -1) {
            console.error(`在${AndroidManifest}文件中没有找到 package字段`)
            return reject()
        }
        let oldPackage = ''
        for (let index = packageIndex, flag = 0; index < content.length; index++) {
            let aChar = content[index]
            //从第一个" 开始取字符 第二个" 结束
            if (aChar == '"') flag++
            if (flag) oldPackage += aChar;
            if (flag == 2) break
        }
        //去" "
        oldPackage = oldPackage.substring(1, oldPackage.length - 1)
        console.log('oldPackage:', oldPackage)
        //替换 `AndroidManifest.xml 中的包名
        let reg = new RegExp(oldPackage)
        content = content.replace(reg, newPackage)
        //console.log(content)
        //重写文件
        fs.writeFileSync(AndroidManifest_path, content, { encoding: 'utf8' })
        finishCb(oldPackage)
        return resolve()
    })

}

//apktool 解包 
//apktool安装 https://ibotpeaches.github.io/Apktool/install/
function apktool_d(oldapkPath: string, finishCb: (err, unPackagePath?: string) => void): Promise<{}> {
    console.log('oldapkPath', oldapkPath)
    let apkName = path.basename(oldapkPath, '.apk')
    let opeationPath = myTools.getParentRoot(oldapkPath)
    console.log('opeationPath:', opeationPath)
    let unPackagePath = `${opeationPath}${path.sep}${apkName}`
    //已经存在删除旧的
    if (fs.existsSync(unPackagePath)) {
        myTools.deleteFileOrDirSync(unPackagePath)
    }
    console.log('解包apk名:', apkName, '父目录是:', opeationPath)
    return new Promise((resolve, reject) => {
        let args = [
            'd',
            `${oldapkPath}`,
        ]
        console.log('要执行的命令:  apktool' + args.join(' '))
        let child = child_process.spawn('apktool', args, { cwd: opeationPath, shell: true })
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);

        child.on('error', err => {
            console.error(err)
            finishCb('使用apktool解包失败')
            reject(err)
        })
        child.on('exit', code => {
            //console.log('exit', code)
            if (code == 0) {
                console.log('使用apktool解包成功')
                finishCb(null, unPackagePath)
                resolve();
            } else {
                finishCb('使用apktool解包失败')
                reject(new Error('使用apktool解包失败'))
            }
        })
    })
}


//apktool 打包 打包完成的文件在dist目录下
//apktool安装 https://ibotpeaches.github.io/Apktool/install/
function apktool_b(unPackagePath: string, finishCb: (err, packagePath?: string) => void): Promise<{}> {
    console.log('unPackagePath', unPackagePath)
    let dirName = myTools.getDirName(unPackagePath)
    let opeationPath = myTools.getParentRoot(unPackagePath)
    let packagePath = `${unPackagePath}${path.sep}dist${path.sep}${dirName}.apk`
    return new Promise((resolve, reject) => {
        let args = [
            'b',
            `${unPackagePath}`,
        ]
        console.log('要执行的命令:  apktool' + args.join(' '))
        let child = child_process.spawn('apktool', args, { cwd: opeationPath, shell: true })
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);

        child.on('error', err => {
            console.error(err)
            finishCb('使用apktool打包失败')
            reject(err)
        })
        child.on('exit', code => {
            //console.log('exit', code)
            if (code == 0) {
                console.log('使用apktool打包成功')
                finishCb(null, packagePath)
                resolve();
            } else {
                finishCb('使用apktool打包失败')
                reject(new Error('使用apktool打包失败'))
            }
        })
    })
}

/**
 * 全局替换 包名
 * 将所有Lcom/ophone/reader/ui替换成 Lcom/ophone/reader/ui01
 * @param unPackagePath 
 * @param newPackage 
 * @param finishCb 
 */
function allSmaliFileReplacePackageInfoSync(unPackagePath: string, oldPackage: string, newPackage: string) {
    //包名格式转换
    //smali 文件中的包名格式 Lcom/ophone/reader/ui
    let isFile = fs.statSync(unPackagePath).isFile()
    if (isFile) {
        recursionFileSync(unPackagePath, oldPackage, newPackage)
    } else {
        recursionDirSync(unPackagePath, oldPackage, newPackage)
    }
}
//文件 替换文本
function recursionFileSync(unPackagePath: string, oldPackage: string, newPackage: string) {
    if (fs.existsSync(unPackagePath) && fs.statSync(unPackagePath).isFile()) {
        if (path.extname(unPackagePath) == '.smali') {
            let smali_oldPackage = 'L'
            let samii_newPackage = 'L'
            let oldPackageArr = oldPackage.split('.')
            let newPackageArr = newPackage.split('.')
            smali_oldPackage += oldPackageArr.join('/')
            samii_newPackage += newPackageArr.join('/')
            console.log(smali_oldPackage, samii_newPackage)
            let content = fs.readFileSync(unPackagePath, { encoding: 'utf8' })
            let reg = new RegExp(smali_oldPackage, 'g')
            content = content.replace(reg, samii_newPackage)
            fs.writeFileSync(unPackagePath, content, { encoding: 'utf8' })
            console.log(`smali文件:${unPackagePath}替换包名成功!`)
        } else if (path.extname(unPackagePath) == '.xml') {
            let content = fs.readFileSync(unPackagePath, { encoding: 'utf8' })
            let reg = new RegExp(oldPackage, 'g')
            content = content.replace(reg, newPackage)
            fs.writeFileSync(unPackagePath, content, { encoding: 'utf8' })
            console.log(`xml文件:${unPackagePath}替换包名成功!`)
        }

    }
}

//目录
function recursionDirSync(unPackagePath: string, oldPackage: string, newPackage: string) {
    let files = []
    if (fs.existsSync(unPackagePath)) {
        files = fs.readdirSync(unPackagePath)
        files.forEach((file, index) => {
            let curPath = unPackagePath + path.sep + file
            if (fs.statSync(curPath).isDirectory()) {
                recursionDirSync(curPath, oldPackage, newPackage) //是目录递归
            } else {
                recursionFileSync(curPath, oldPackage, newPackage)
            }
        })
    }
}