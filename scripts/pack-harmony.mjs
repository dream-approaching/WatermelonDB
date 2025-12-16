#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 鸿蒙化版本的打包脚本
 * 用于构建并打包 @react-native-ohos/watermelondb
 * 
 * 使用方式：
 *   node scripts/pack-harmony.mjs
 * 
 * 这个脚本会：
 * 1. 运行 npm run build 构建到 dist/ 目录
 * 2. 在 dist/ 目录下运行 npm pack 生成 .tgz 文件
 * 3. 生成的 .tgz 文件会包含和原库相同的结构（构建产物 + src/ 源码）
 */

import { execa } from 'execa'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs-extra'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.resolve(ROOT_DIR, 'dist')

async function main() {
  try {
    console.log('📦 开始构建和打包鸿蒙化版本...\n')

    // 步骤 1: 构建到 dist/ 目录
    console.log('1️⃣  运行构建流程...')
    await execa('npm', ['run', 'build'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    })
    console.log('✅ 构建完成\n')

    // 步骤 2: 检查 dist/ 目录是否存在
    if (!fs.existsSync(DIST_DIR)) {
      throw new Error(`dist/ 目录不存在，构建可能失败了`)
    }

    // 步骤 3: 在 dist/ 目录下打包
    console.log('2️⃣  在 dist/ 目录下打包...')
    await execa('npm', ['pack'], {
      cwd: DIST_DIR,
      stdio: 'inherit',
    })
    console.log('✅ 打包完成\n')

    // 步骤 4: 查找生成的 .tgz 文件
    const files = fs.readdirSync(DIST_DIR)
    const tgzFiles = files.filter((file) => file.endsWith('.tgz'))
    
    if (tgzFiles.length === 0) {
      throw new Error('未找到生成的 .tgz 文件')
    }

    // 如果只有一个文件，将它移动到根目录
    if (tgzFiles.length === 1) {
      const tgzFile = tgzFiles[0]
      const sourcePath = path.join(DIST_DIR, tgzFile)
      const targetPath = path.join(ROOT_DIR, tgzFile)
      
      fs.moveSync(sourcePath, targetPath, { overwrite: true })
      console.log(`✅ 打包文件已生成: ${tgzFile}`)
      console.log(`   文件位置: ${targetPath}\n`)
    } else {
      console.log(`⚠️  找到多个 .tgz 文件:`)
      tgzFiles.forEach((file) => {
        console.log(`   - ${path.join(DIST_DIR, file)}`)
      })
    }

    console.log('🎉 完成！现在可以使用以下命令安装：')
    console.log(`   npm install ${tgzFiles[0]}`)
  } catch (error) {
    console.error('\n❌ 打包失败:', error.message)
    process.exit(1)
  }
}

main()
