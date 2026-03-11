#!/bin/bash
# Tauri 开发环境检查脚本 - Linux

echo -e "\033[36m========================================"
echo "   Tauri 开发环境检查 - Linux"
echo -e "========================================\033[0m\n"

ALL_GOOD=true

# 1. 检查 Node.js
echo -e "\033[33m[1/6] 检查 Node.js...\033[0m"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  \033[32m✓ Node.js: $NODE_VERSION\033[0m"
else
    echo -e "  \033[31m✗ Node.js 未安装\033[0m"
    echo -e "    安装方法："
    echo -e "    Ubuntu/Debian: sudo apt install nodejs npm"
    echo -e "    Fedora: sudo dnf install nodejs npm"
    echo -e "    Arch: sudo pacman -S nodejs npm"
    ALL_GOOD=false
fi

# 2. 检查 npm
echo -e "\n\033[33m[2/6] 检查 npm...\033[0m"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  \033[32m✓ npm: v$NPM_VERSION\033[0m"
else
    echo -e "  \033[31m✗ npm 未安装\033[0m"
    ALL_GOOD=false
fi

# 3. 检查 Rust
echo -e "\n\033[33m[3/6] 检查 Rust...\033[0m"
if command -v rustc &> /dev/null && command -v cargo &> /dev/null; then
    RUSTC_VERSION=$(rustc --version)
    CARGO_VERSION=$(cargo --version)
    echo -e "  \033[32m✓ Rust: $RUSTC_VERSION\033[0m"
    echo -e "  \033[32m✓ Cargo: $CARGO_VERSION\033[0m"
else
    echo -e "  \033[31m✗ Rust 未安装\033[0m"
    echo -e "    安装命令: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    ALL_GOOD=false
fi

# 4. 检查 C 编译器
echo -e "\n\033[33m[4/6] 检查 C 编译器...\033[0m"
if command -v gcc &> /dev/null; then
    GCC_VERSION=$(gcc --version | head -n1)
    echo -e "  \033[32m✓ GCC: $GCC_VERSION\033[0m"
elif command -v clang &> /dev/null; then
    CLANG_VERSION=$(clang --version | head -n1)
    echo -e "  \033[32m✓ Clang: $CLANG_VERSION\033[0m"
else
    echo -e "  \033[31m✗ C 编译器未安装\033[0m"
    echo -e "    安装方法："
    echo -e "    Ubuntu/Debian: sudo apt install build-essential"
    echo -e "    Fedora: sudo dnf install gcc gcc-c++"
    echo -e "    Arch: sudo pacman -S base-devel"
    ALL_GOOD=false
fi

# 5. 检查 pkg-config
echo -e "\n\033[33m[5/6] 检查 pkg-config...\033[0m"
if command -v pkg-config &> /dev/null; then
    PKG_CONFIG_VERSION=$(pkg-config --version)
    echo -e "  \033[32m✓ pkg-config: $PKG_CONFIG_VERSION\033[0m"
else
    echo -e "  \033[31m✗ pkg-config 未安装\033[0m"
    echo -e "    Ubuntu/Debian: sudo apt install pkg-config"
    echo -e "    Fedora: sudo dnf install pkgconf-pkg-config"
    echo -e "    Arch: sudo pacman -S pkgconf"
    ALL_GOOD=false
fi

# 6. 检查系统库
echo -e "\n\033[33m[6/6] 检查系统开发库...\033[0m"
MISSING_LIBS=()

# 检测发行版
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    DISTRO="unknown"
fi

# 检查 webkit2gtk
if pkg-config --exists webkit2gtk-4.0 2>/dev/null || pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    echo -e "  \033[32m✓ WebKit2GTK\033[0m"
else
    echo -e "  \033[31m✗ WebKit2GTK 未安装\033[0m"
    MISSING_LIBS+=("webkit2gtk")
fi

# 检查 gtk3
if pkg-config --exists gtk+-3.0 2>/dev/null; then
    echo -e "  \033[32m✓ GTK3\033[0m"
else
    echo -e "  \033[31m✗ GTK3 未安装\033[0m"
    MISSING_LIBS+=("gtk3")
fi

# 检查 libssl
if pkg-config --exists openssl 2>/dev/null; then
    echo -e "  \033[32m✓ OpenSSL\033[0m"
else
    echo -e "  \033[31m✗ OpenSSL 开发库未安装\033[0m"
    MISSING_LIBS+=("openssl")
fi

# 检查其他常用库
for lib in libsoup-2.4 javascriptcoregtk-4.0; do
    if pkg-config --exists $lib 2>/dev/null; then
        echo -e "  \033[32m✓ $lib\033[0m"
    fi
done

# 如果有缺失的库，提供安装命令
if [ ${#MISSING_LIBS[@]} -gt 0 ]; then
    ALL_GOOD=false
    echo -e "\n  \033[33m缺少必需的系统库，请根据你的发行版安装：\033[0m"
    
    case $DISTRO in
        ubuntu|debian|pop|linuxmint)
            echo -e "  \033[36mUbuntu/Debian:\033[0m"
            echo "    sudo apt update"
            echo "    sudo apt install libwebkit2gtk-4.0-dev \\"
            echo "        build-essential \\"
            echo "        curl \\"
            echo "        wget \\"
            echo "        file \\"
            echo "        libssl-dev \\"
            echo "        libgtk-3-dev \\"
            echo "        libayatana-appindicator3-dev \\"
            echo "        librsvg2-dev"
            ;;
        fedora|rhel|centos)
            echo -e "  \033[36mFedora/RHEL:\033[0m"
            echo "    sudo dnf install webkit2gtk4.0-devel \\"
            echo "        openssl-devel \\"
            echo "        curl \\"
            echo "        wget \\"
            echo "        file \\"
            echo "        gtk3-devel \\"
            echo "        libappindicator-gtk3-devel \\"
            echo "        librsvg2-devel"
            ;;
        arch|manjaro)
            echo -e "  \033[36mArch Linux:\033[0m"
            echo "    sudo pacman -S --needed \\"
            echo "        webkit2gtk \\"
            echo "        base-devel \\"
            echo "        curl \\"
            echo "        wget \\"
            echo "        file \\"
            echo "        openssl \\"
            echo "        gtk3 \\"
            echo "        libappindicator-gtk3 \\"
            echo "        librsvg"
            ;;
        opensuse*)
            echo -e "  \033[36mopenSUSE:\033[0m"
            echo "    sudo zypper install webkit2gtk3-devel \\"
            echo "        libopenssl-devel \\"
            echo "        curl \\"
            echo "        wget \\"
            echo "        file \\"
            echo "        gtk3-devel \\"
            echo "        libappindicator3-devel \\"
            echo "        librsvg-devel"
            ;;
        *)
            echo -e "  \033[33m无法识别的发行版: $DISTRO\033[0m"
            echo -e "  请参考 Tauri 官方文档安装依赖："
            echo -e "  https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux"
            ;;
    esac
fi

# 总结
echo -e "\n\033[36m========================================\033[0m"
if [ "$ALL_GOOD" = true ]; then
    echo -e "\033[32m✓ 所有必需依赖都已安装！\033[0m"
    echo -e "\033[32m  可以开始 Tauri 开发了 🚀\033[0m"
else
    echo -e "\033[31m✗ 缺少部分依赖，请参考上面的安装提示\033[0m"
fi
echo -e "\033[36m========================================\033[0m\n"

# 额外：检查 Tauri CLI
echo -e "\033[36m额外检查：\033[0m"
if command -v cargo &> /dev/null; then
    if cargo tauri --version &> /dev/null; then
        TAURI_VERSION=$(cargo tauri --version 2>/dev/null)
        echo -e "  \033[32m✓ Tauri CLI: $TAURI_VERSION\033[0m"
    else
        echo -e "  \033[33m⚠ Tauri CLI 未安装（首次使用时会自动安装）\033[0m"
        echo -e "    手动安装: cargo install tauri-cli"
    fi
fi

echo ""
