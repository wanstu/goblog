import {defineConfig, loadEnv} from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname);
  console.log(env, 'env')
  return {
   plugins: [
     uni(),
   ],
   server: {
     host: '0.0.0.0', // 监听所有地址
     port: 7001, // 指定启动端口
     // open: "https://local.www.wanstu.cn"	// 启动后自动打开浏览器
   },
    // 配置全局变量，让UniApp也能访问到Vite的环境变量
  define: {
    'process.env': { ...process.env, ...env }
  },
  // 配置路径别名
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      '@/': path.resolve(__dirname, 'src'),
    }
  }
 }
})
