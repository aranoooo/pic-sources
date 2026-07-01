# 废文网香色闺阁书源

目标站点：`https://www.sosadfun.org` / `https://www.废文.com`

本源按 `cloudmantou/xiangseSkill` 的香色闺阁 StandarReader 2.56.1 规则编写，采用新结构：

- 顶层：`{"源别名": { ...sourceConfig }}`
- 基础字段：`sourceName/sourceUrl/sourceType/enable/weight`
- 动作：`searchBook/bookDetail/chapterList/chapterContent/bookWorld`
- 请求：`requestInfo` 使用 `@js:`，运行时变量为 `config/params/result`
- 请求头：根级 `httpHeaders`，动作请求里返回 `httpHeaders: config.httpHeaders`

## 文件

- `xs-fewen.json`：可审阅 JSON 源文件，建议作为维护主文件。
- `xs-fewen.xbs`：同内容 UTF-8 文本版，方便查看和下载。
- `debug-notes-fewen.md`：字段转换与待实测点。

注意：真正的香色二进制/封装 `.xbs` 通常需要用 `xiangseSkill` 的工具从 JSON 转换。当前 GitHub 写入工具只能提交 UTF-8 文本，不能直接提交二进制封装文件。建议导入前执行：

```bash
python tools/scripts/xbs_tool.py json2xbs -i xs-fewen.json -o xs-fewen.packed.xbs
python tools/scripts/xbs_tool.py roundtrip -i xs-fewen.json -p xs-fewen
```

## Cookie 登录

废文网需要登录后阅读。本源是手动 Cookie 登录版。

请在 `httpHeaders` 里替换占位值：

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
- 正文解密框架：按废文 `d("密文", "密钥")`、MD5、AES/CBC/PKCS5Padding 实现
- 分类入口：`bookWorld` 已加入原创、同人、BL、BG、GL、无CP、连载、完结

## 分类说明

当前没有抓到可靠的废文官方分类页 URL，所以第一版没有编造 `/category/...` 这种路径。

`bookWorld` 目前是“分类搜索入口”：复用真实搜索接口，用分类词做检索。例如：

- `/search/原创/1/`
- `/search/同人/1/`
- `/search/BL/1/`
- `/search/完结/1/`

后续如果抓到真实分类页或分类接口，再把 `bookWorld` 替换成正式分类。

## 需要 App 实测

这些点必须在香色闺阁 App 里测：

- `sourceComment/help` 是否会被编辑器保留。
- `httpHeaders.cookie` 是否会被所有动作带上。
- `chapterContent.parserID = "JS"` 时，`content @js` 里拿到的 `result` 是否是原始章节 HTML。
- 香色 2.56.1 JS 环境是否存在 `java.md5Encode/java.aesBase64DecodeToString`。
- 是否存在全局 `md5` 或 `CryptoJS`。
- `bookWorld` 嵌套分类 map 是否在你的 App 版本里正常显示。

如果正文显示 TODO 或空白，请把 App 报错、脱敏章节 HTML 里 `d("...", "...")` 附近片段发出来。

## 测试顺序

1. 导入 JSON 或转换后的 packed XBS。
2. 填 Cookie。
3. 搜索一个确定存在的书名。
4. 打开详情，检查作者、简介、分类、状态、最新章节。
5. 打开目录，检查第一页和分页目录。
6. 打开章节，检查正文是否解密为明文。
7. 进入分类入口，检查分类搜索是否返回结果。

## Cookie 失败排查

请提供脱敏信息：

- 返回登录页、403、404，还是空白。
- 浏览器同一 Cookie 是否能打开章节。
- 香色请求头里是否真的带了 `cookie`。
- 是否需要大写 `Cookie` 而不是小写 `cookie`。

## 签到 TODO

第一版没有写签到功能，因为没有抓到废文签到接口。

后续要补签到，请抓包提供：

- Request URL
- Request Method
- Headers
- Payload/Form Data
- Response
- 签到成功、已签到、未登录三种样例

如果香色支持前置请求，可以在打开搜索、目录或正文前触发签到。如果不支持前置请求，就不能后台定时签到，只能在用户打开源并触发页面请求时顺手签到。
