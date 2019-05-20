# AndroidResign
#准备工作
安装windows版 unzip nodejs模块的解压有很多bug
安装apktool https://ibotpeaches.github.io/Apktool/install/
Android apk 重签名,改包名

#重签名 运行reSignPackage方法 
自定义自己的apk路径和key 路径
let apkPath = `${RES_MAP.resDir}${path.sep}wanhui.apk` //要重新签名的apk路径 (自定义) 
let apkName = path.basename(apkPath, '.apk')
let keystorePath = `${RES_MAP.keyDir}${path.sep}androidPackageKey.jks` //重新签名所需要的key路径 (自定义)
let keystorePassword = 123456 //keystore密码 (自定义)
let keyAlias = 'key0' //keyAlias 别名 (自定义)
let keypassPassword = 123456 //key密码 (自定义)
let resignedjarPath = `${RES_MAP.outputDir}${path.sep}signed_${apkName}.apk`//重新签名后的apk路径 (自定义)

#改包名 reNamePackage方法
改包名也需要重重新签名,指定相关重签名需要的参数
