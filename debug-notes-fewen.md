# 废文网香色书源转换记录

## 本次导入失败修复

旧版 `xs-fewen.xbs` 是 UTF-8 JSON 文本版，不是真正香色封装文件，所以 App 导入会显示无内容。现已按 `xbsrebuild` 的 `Json2XBS` 算法修复：

1. 读取 `xs-fewen.json` 的 UTF-8 字节。
2. 补零到 4 字节倍数。
3. 追加原始 JSON 长度的小端 uint32。
4. 使用固定 key 做 XXTEA 加密。
5. 输出真正 packed `xs-fewen.xbs`。

仓库已加入 `.github/workflows/build-fewen-xbs.yml`，以后修改 `xs-fewen.json` 时会自动重新生成 packed XBS。

## 参考资料

1. `cloudmantou/xiangseSkill`
   - `README.md`
   - `docs/XBS_JSON_CODING_RULES.md`
   - `skills/global/xbs-booksource-workflow.SKILL.md`
   - `skills/local/xiangse-booksource.SKILL.md`
   - `docs/香色书源开发指南与工作流程.md`
2. 用户提供的源阅读废文规则。
3. 用户描述的长佩参考源要点：登录源在 `httpHeaders` 中提示填写 Cookie，形如 `{"cookie":"你的 cookie 值"}`。

本轮没有成功读取本地 `D:/浏览器下载/🐲长佩文学🔮🍪©️(1).xbs` 原文件，因此没有照搬其私有字段，只采用用户明确给出的 Cookie 写法。

## 香色 2.56.1 格式决策

`xiangseSkill` 明确要求：顶层是 `{ "<sourceAlias>": { ...sourceConfig } }`；使用 `sourceName/sourceUrl/sourceType/enable/weight`；`sourceType` 为 `text`；`enable` 为 `1/0`；`weight` 为整数字符串；动作包含 `actionID/parserID/responseFormatType/requestInfo`；`requestInfo @js` 使用 `config/params/result`；请求对象用 `POST/httpParams/httpHeaders`。

因此本版没有把源阅读 JSON 原样输出，而是转换为香色结构。

## 源阅读字段映射

| 源阅读字段 | 香色字段 |
| --- | --- |
| `bookSourceName` | `sourceName` |
| `bookSourceUrl` | `sourceUrl` / `host` |
| `ruleSearch` | `searchBook` |
| `ruleBookInfo` | `bookDetail` |
| `ruleToc` | `chapterList` |
| `ruleContent` | `chapterContent` |
| `enabledCookieJar/httpHeaders` | 根级 `httpHeaders` + 每个 `requestInfo` 返回 `config.httpHeaders` |
| `bookSourceComment` | `sourceComment/help` |

## 搜索

源阅读搜索列表 `.SHsectionThree-middle>p` 转为 XPath：

- `list`: `//div[contains(concat(' ', normalize-space(@class), ' '), ' SHsectionThree-middle ')]/p`
- `bookName/title`: `//a[position()=2]/text()`
- `author`: `//a[last()]/text()`
- `cat`: `//a[position()=1]/text()`
- `detailUrl/url`: `//a[position()=2]/@href`

搜索请求：`/search/encodeURIComponent(params.keyWord)/page/`。

## 详情

使用 `og:novel:*` meta：作者、简介、分类、状态、最新章节、更新时间。简介清洗保留源阅读思路：删除 `《书名》是由...一本...书籍。` 类型模板句。

## 目录

- `list`: `//ol//a`
- `title`: `//text()`
- `url/detailUrl`: `//@href`

分页目录按 `nextPageUrl` 逐页递进：从 `//*[@id='end']/@href` 提取最大页码，当前页小于最大页时返回下一页 `2.html/3.html/...`。

## 正文解密

源阅读逻辑：匹配 `d("密文", "密钥")`，`MD5(密钥)`，前 16 位为 AES key，后 16 位为 iv，使用 `AES/CBC/PKCS5Padding` 解 Base64。

香色实现依次尝试：`java.md5Encode/java.aesBase64DecodeToString`、全局 `md5`、`CryptoJS.MD5/CryptoJS.AES.decrypt`。如果都不存在，返回 TODO 文本，不伪装成功。

## 分类 bookWorld

没有抓到可靠官方分类 URL，因此没有编造分类接口。当前实现是分类搜索入口：原创、同人、BL、BG、GL、无CP、连载、完结。

## 签到

没有实现签到，因为没有抓到接口。后续需要提供 Request URL、Request Method、Headers、Payload/Form Data、Response，以及成功、已签到、未登录样例。
