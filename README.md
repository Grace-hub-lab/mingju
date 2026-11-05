# 名著金句

纯静态 PWA，收录名著里的经典句子。手机浏览器打开即可用，也可以“添加到主屏幕”。

## 功能

- 今日一句：按日期固定一句，每天换一句；也可以“随机一句”
- 书库：按中国 / 外国筛选，点开一本书看它的全部句子
- 搜索：搜句子、书名、作者，关键词高亮
- 收藏：存在本机浏览器（localStorage），不上传
- 每句都可以复制、分享（手机上调起系统分享）
- 离线可用，跟随系统深色模式

## 本地预览

```powershell
npm start      # http://localhost:5173
```

## 加句子 / 加书

编辑 `public/quotes.js`：

- 加句子：追加到对应书 `quotes` 数组的**末尾**（收藏按序号记录，插在中间会让已收藏的句子错位）
- 一句可以是字符串，也可以写成 `{ t: '正文', n: '出处，如 第五回' }`
- 加书：在 `BOOKS` 里加一个对象，`id` 要唯一，`region` 填 `cn` 或 `world`

改完前端文件后，把 `public/sw.js` 里的 `VERSION` 加 1，已安装的 App 才会自动更新。

## 部署到 GitHub Pages

1. 新建仓库（免费账号需要 public），推送代码到 `main`
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**
3. 再推一次（或在 Actions 里手动运行），等部署完成后访问 `https://<用户名>.github.io/<仓库名>/`

## 重新生成图标

```powershell
npm run icons
```
