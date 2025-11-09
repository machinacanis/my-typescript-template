# my-typescript-template

如你所见，这是一个自用的 TypeScript 项目模版，不过你看到了也想拿去用也完全没问题。

由于 TypeScript 本身的一些局限性，它的开发环境配置起来实在是烦人，这个模版用来直接搭建一个包含所有我的常用需求的小型 TypeScript 项目，这样就不用每次开项目都要浪费时间去配置环境了。

## 模板内容

- 基于 [`Bun`](https://bun.com/docs) 工具链
- ESLint 配置
- Prettier 配置
- TypeScript 配置
- 基于 `tslog` 封装了功能齐全开箱即用的日志包

## 初始依赖

| 依赖名称 | 版本    | 说明                                           |
| -------- | ------- | ---------------------------------------------- |
| bun      | ^1.3.x  | JavaScript 运行时和包管理器                    |
| zod      | ^4.1.x  | TypeScript 数据验证库，就像给 ts 用的 Pydantic |
| tslog    | ^4.10.x | TypeScript 日志库                              |
| chalk    | ^5.6.x  | 终端字符串样式库                               |

## 使用

### 1. 克隆

#### A. 使用 Github 的模板功能

直接点右上角的 `Use this template` 按钮，然后创建一个新的仓库即可。

#### B. 手动克隆

```bash
git clone git@github.com:machinacanis/my-typescript-template.git your-project-name
cd your-project-name
rm -rf .git # 删掉仓库自身的 git 信息，毕竟我觉得你不会想要在 Git 记录里看到这个仓库的提交记录的
```

### 2. 初始化项目依赖

```bash
bun install
```

### 3. 修改项目配置

修改 `package.json` 和 `tsconfig.json` 里的相关字段以符合你的项目需求。

## 命令

## 编译

因为使用了 `Bun` 作为运行时和包管理器，除了可以打包成标准的js包之外，直接编译成二进制文件也很方便。

### 直接编译

```bash
bun build ./index.ts --compile --outfile <文件名>
```

### 交叉编译

```bash
bun build ./index.ts --compile --target <目标平台> --outfile <文件名>
```

可用的目标平台有：

- bun-linux-x64
- bun-linux-arm64
- bun-windows-x64
- bun-windows-arm64
- bun-darwin-x64
- bun-darwin-arm64
- bun-linux-x64-musl
- bun-linux-arm64-musl

对于部分平台，还有baseline和modern两个子选项，可以通过在目标平台名称后面跟上`-baseline`或`-modern`来指定。

详见[Bun 官方文档](https://bun.com/docs/bundler/executables#cross-compile-to-other-platforms)。

### 生产环境

通过添加 `--minify` 和 `--sourcemap` 这两个参数，可以生成适合生产环境的编译结果。

- `--minify` 会对代码进行压缩让二进制文件更小，也会改善启动速度
- `--sourcemap` 会生成 sourcemap 文件，这样堆栈信息会更友好

通过 `--bytecode` 参数，可以直接将代码编译成 Bun 字节码，这个工作本来是 Bun 在运行时自动完成的，但是提前编译成字节码也可以改善启动速度。

```bash
bun build --compile --minify --sourcemap --bytecode ./index.ts --outfile <文件名>
```

如果使用了 Worker 多进程，那么应该把 Worker 的入口文件也添加到编译命令中：

```bash
bun build --compile --minify --sourcemap --bytecode ./index.ts ./worker.ts --outfile <文件名>
```

## 碎碎念

### 为什么是 Bun 而不是 Node.js？

单纯是因为我不喜欢比较传统的 js/ts 项目结构，仅此而已，Bun 的设计能让我找回来一点写 golang 的感觉。

而且我主要是在写一些后端和 Web 相关的东西，使用 TypeScript 是因为我很喜欢 ts 的一些语法设计，Bun 更符合我自己的需求。

而且 Bun 有原生的 TypeScript 支持。

### 为什么是 Tab 以及 4 空格缩进？

Tab 缩进写的舒服，就这样，什么压缩率之类的我不管，大不了你自己改就是了（笑

你们写 js 的都是\*\*精神变态吗，那 2 空格缩进根本不可读，这忍得住的不改的？？？

### 不用 VSCode 怎么办？

我自己用的是 Zed，Zed 在使用 ESLint 和 Prettier 时需要手动进行一些配置：

```json
// 一些LSP相关的设置
"languages": {
  "TypeScript": {
    "formatter": "prettier",
    "code_actions_on_format": {
      "source.fixAll.eslint": true
    },
    "format_on_save": "on"
  },
  "TSX": {
    "formatter": "prettier",
    "code_actions_on_format": {
      "source.fixAll.eslint": true
    },
    "format_on_save": "on"
  },
  "JavaScript": {
    "formatter": "prettier",
    "code_actions_on_format": {
      "source.fixAll.eslint": true
    },
    "format_on_save": "on"
  },
  "Markdown": {
    "formatter": "prettier",
    "code_actions_on_format": {
      "source.fixAll.eslint": true
    },
    "format_on_save": "on"
  }
}
```

这样就可以直接在保存时自动执行 ESLint 和 Prettier 了。
