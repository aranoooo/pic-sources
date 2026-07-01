# 废文网香色闺阁书源

目标站点：`https://www.sosadfun.org` / `https://www.废文.com`

本源按 `cloudmantou/xiangseSkill` 的香色闺阁 StandarReader 2.56.1 规则编写，采用新结构：`sourceName/sourceUrl/sourceType/enable/weight`，以及 `searchBook/bookDetail/chapterList/chapterContent/bookWorld`。

## 导入

请导入这个 packed XBS：

```text
https://raw.githubusercontent.com/aranoooo/pic-sources/main/xs-fewen.xbs
```

`xs-fewen.json` 是维护源码，不是首选导入文件。仓库里已经加了 GitHub Actions：以后修改 `xs-fewen.json` 后，会自动重新生成真正封装后的 `xs-fewen.xbs`。

如果你刚才导入过旧版，香色可能缓存了旧文件。请先删除旧书源，再用上面的 raw 链接重新导入；必要时给链接加一个无意义参数刷新缓存：

```text
https://raw.githubusercontent.com/aranoooo/pic-sources/main/xs-fewen.xbs?v=packed1
```

## Cookie 登录

废文网需要登录后阅读。本源是手动 Cookie 登录版。

请在书源的 `httpHeaders` 里替换占位值：

```json
{"cookie":"你的 cookie 值"}
```

不要把账号密码写进源文件。不要把真实 Cookie 公开提交到 GitHub。Cookie 失效后，需要重新登录网页并重新填写。

## 已实现

- 搜索小说：`/search/{{key}}/{{page}}/`
- 搜索结果：书名、作者、分类、详情地址
- 详情：作者、简介、分类、状态、最新章节、更新时间、封面兜底
- 目录：`/catalog/`
- 分页目录：从 `#end@href` 提取最大页码，逐页请求 `2.html` 到最后一页
- 正文请求：带 Cookie、User-Agent、Referer
- 正文 AES 解密框架：按废文 `d("密文", "密钥")`、MD5、AES/CBC/PKCS5Padding 实现
- 分类入口：`bookWorld` 已加入原创、同人、BL、BG、GL、无CP、连载、完结

## 分类说明

当前没有抓到可靠的废文官方分类页 URL，所以第一版没有编造 `/category/...` 这种路径。

`bookWorld` 目前是“分类搜索入口”：复用真实搜索接口，用分类词做检索。例如 `/search/原创/1/`、`/search/BL/1/`、`/search/完结/1/`。后续如果抓到真实分类页或分类接口，再替换为正式分类。

## 需要 App 实测

- `httpHeaders.cookie` 是否会被所有动作带上。
- `chapterContent.parserID = "JS"` 时，`content @js` 里拿到的 `result` 是否是原始章节 HTML。
- 香色 2.56.1 JS 环境是否存在 `java.md5Encode/java.aesBase64DecodeToString`。
- 是否存在全局 `md5` 或 `CryptoJS`。
- `bookWorld` 嵌套分类 map 是否在你的 App 版本里正常显示。

如果正文显示 TODO 或空白，请把 App 报错、脱敏章节 HTML 里 `d("...", "...")` 附近片段发出来。

## 测试顺序

1. 删除刚才导入失败的旧源。
2. 重新导入 packed XBS raw 链接。
3. 填 Cookie。
4. 搜索一个确定存在的书名。
5. 打开详情，检查作者、简介、分类、状态、最新章节。
6. 打开目录，检查第一页和分页目录。
7. 打开章节，检查正文是否解密为明文。
8. 进入分类入口，检查分类搜索是否返回结果。

## Cookie 失败排查

请提供脱敏信息：返回登录页、403、404 还是空白；浏览器同一 Cookie 是否能打开章节；香色请求头里是否真的带了 `cookie`；是否需要大写 `Cookie`。

## 签到 TODO

第一版没有写签到功能，因为没有抓到废文签到接口。后续要补签到，请抓包提供 Request URL、Request Method、Headers、Payload/Form Data、Response，以及签到成功、已签到、未登录三种样例。
