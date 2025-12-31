# MicroRepository 📚

A template that gathers the minimal structure of my repository.

## 🚀 Features

- Modern `README.md`
- Multiple licenses: `Apache 2.0` and `SUSHI-WARE`
- Modified `clinrules`

<!-- ## 🛠 Installation -->

<!-- ```bash -->
<!-- brew install micro-repository -->
<!-- ``` -->

<!-- ### 🏗 Build from Source -->

<!-- ```sh -->
<!-- git clone https://github.com/HidemaruOwO/MicroRepository.git -->
<!-- cd MicroRepository -->

<!-- make -j8 -->

<!-- install -Dm0755 -t "/usr/local/bin/" "dist/builded-binary" -->
<!-- ``` -->

<!-- - Arch Linux -->

<!-- ```sh -->
<!-- git clone https://github.com/HidemaruOwO/MicroRepository.git -->
<!-- cd MicroRepository -->

<!-- makepkg -si -->
<!-- ``` -->

## 🎯 Usage

A guide to using this repository template:

1. Click `Use this template` > `Create a new repository` in the top right corner.
2. Clone the created repository, rename README.example.md to README.md, edit it with your preferred editor, and migrate.

```bash
mv README.example.md README.md

# For Linux users
sed -i 's;HidemaruOwO/MyRepository;USERNAME/REPONAME;g' README.md

# For macOS users
sed -i '' 's;HidemaruOwO/MyRepository;USERNAME/REPONAME;g' README.md
```

3. Edit credits in LICENSE and licenses/SUSHI-WARE.txt.

> [!IMPORTANT]
> If you don't change the credit in the license file, I will usually own the rights to your software. (LoL)

### ✏️ About text editors

This repository is designed to be edited with any text editor, but I recommend using [Neovim](https://neovim.io/) for handwritten, [Roo Code](https://github.com/RooCodeInc/Roo-Code) for pair-programming with AI, and [OpenCode](https://opencode.ai/) for agentic-coding.

#### 💥 Alternatives

| Text Editor          | Alternatives                               |
| -------------------- | ------------------------------------------ |
| Neovim               | VSCode, Sublime Text, Atom, Emacs, etc.    |
| Roo Code (.roorules) | GitHub Copilot, Cursor, Windsurf, etc.     |
| OpenCode             | Claude Code, Gemini CLI, OpenAI Codex etc. |

#### 📝 Usage Scenarios

| Project Type | Phase                               | Neovim                                                                         | Roo                                                                              | OpenCode                                                                    |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| New          | Requirements Definition & Design    | • Create specifications and design documents manually to deepen understanding  |                                                                                  |                                                                             |
| New          | Module-Level Development            |                                                                                | • Receive AI suggestions per function and implement while reviewing explanations |                                                                             |
| New          | Full Skeleton Generation            |                                                                                |                                                                                  | • Generate directory structures and boilerplate code in bulk for fast setup |
| Existing     | Bug Investigation & Refactoring     | • Read code deeply and make manual fixes for better understanding and learning |                                                                                  |                                                                             |
| Existing     | Small Feature Additions & Tests     |                                                                                | • Interactively generate test code or small functions                            |                                                                             |
| Existing     | Large-Scale Changes & Documentation |                                                                                |                                                                                  | • Perform large-scale refactoring or documentation updates in bulk          |

## 🌍 For contributer

By contributing to this project, you agree to the following terms:

1. **You grant a license**: You grant the project owner a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, modify, distribute, and sublicense your contributions under the **Apache License 2.0**.
2. **You retain ownership**: You still own the copyright of your contribution, but you waive any claims against the project related to your contribution.
3. **No additional patent rights**: You **do not** grant additional patent rights beyond what is covered by Apache 2.0.
4. **Your contributions are original**: You confirm that your contributions do not violate any third-party rights.

By submitting a pull request, you agree to these terms.

## 📜 License

<div align="left" style="flex: inline" >
<a href="https://www.apache.org/licenses/LICENSE-2.0" >
<img src="https://img.shields.io/badge/License-Apache%20License%202.0-blue.svg" alt="Apache License 2.0"
</a>
<a href="https://github.com/MakeNowJust/sushi-ware" >
<img src="https://img.shields.io/badge/License-SUSHI--WARE%20%F0%9F%8D%A3-blue.svg" alt="SUSHI-WARE LICENSE"
</a>
</div>

This project is dual-licensed under [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) and [SUSHI-WARE LICENSE](https://github.com/MakeNowJust/sushi-ware).

A reference to the latest license should be used, even if the attached license is outdated of major versions.

## 🤝 Reference

This repository was created using the [MicroRepository](https://github.com/HidemaruOwO/MicroRepository) template.

- [HidemaruOwO/MicroRepository](https://github.com/HidemaruOwO/MicroRepository)
