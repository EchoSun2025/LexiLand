"""
自动下载 ECDICT 并转换为词典
"""

import os
import sys
import urllib.request
import zipfile
from pathlib import Path

# ECDICT 下载链接（使用 Release 或镜像）
ECDICT_URLS = [
    # GitHub Release (优先)
    "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-csv-1.0.28.zip",
    # 备用链接
    "https://github.com/skywind3000/ECDICT/raw/master/stardict.csv",
]

def download_file(url, output_path, show_progress=True):
    """下载文件并显示进度"""
    print(f"Downloading from {url}")
    
    try:
        def reporthook(blocknum, blocksize, totalsize):
            if show_progress and totalsize > 0:
                percent = min(blocknum * blocksize * 100 / totalsize, 100)
                downloaded = blocknum * blocksize / 1024 / 1024
                total = totalsize / 1024 / 1024
                print(f"\r  Progress: {percent:.1f}% ({downloaded:.1f}/{total:.1f} MB)", end='')
        
        urllib.request.urlretrieve(url, output_path, reporthook)
        if show_progress:
            print()  # 换行
        return True
    except Exception as e:
        print(f"\n❌ Download failed: {e}")
        return False

def extract_zip(zip_path, extract_to):
    """解压 ZIP 文件"""
    print(f"Extracting {zip_path}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        print("✓ Extraction complete")
        return True
    except Exception as e:
        print(f"❌ Extraction failed: {e}")
        return False

def download_ecdict():
    """下载 ECDICT 数据"""
    scripts_dir = Path(__file__).parent
    csv_file = scripts_dir / "stardict.csv"
    
    # 如果已存在，询问是否重新下载
    if csv_file.exists():
        print(f"✓ Found existing stardict.csv ({csv_file.stat().st_size / 1024 / 1024:.1f} MB)")
        response = input("Re-download? (y/N): ").strip().lower()
        if response != 'y':
            return str(csv_file)
    
    print("\n" + "="*60)
    print("Downloading ECDICT dictionary...")
    print("="*60)
    
    # 尝试从多个源下载
    for i, url in enumerate(ECDICT_URLS):
        print(f"\nTrying source {i+1}/{len(ECDICT_URLS)}...")
        
        if url.endswith('.zip'):
            # 下载 ZIP 文件
            zip_file = scripts_dir / "ecdict.zip"
            if download_file(url, zip_file):
                # 解压
                if extract_zip(zip_file, scripts_dir):
                    # 查找 CSV 文件
                    for file in scripts_dir.glob("*.csv"):
                        if 'stardict' in file.name or 'ecdict' in file.name:
                            # 重命名为标准名称
                            file.rename(csv_file)
                            print(f"✓ Found dictionary: {csv_file}")
                            # 删除 ZIP
                            zip_file.unlink()
                            return str(csv_file)
                # 删除失败的 ZIP
                if zip_file.exists():
                    zip_file.unlink()
        else:
            # 直接下载 CSV
            if download_file(url, csv_file):
                return str(csv_file)
    
    print("\n❌ All download sources failed!")
    print("\nPlease manually download stardict.csv:")
    print("  1. Visit: https://github.com/skywind3000/ECDICT")
    print("  2. Download stardict.csv or ecdict.csv")
    print(f"  3. Place it in: {scripts_dir}")
    return None

if __name__ == '__main__':
    print("="*60)
    print("ECDICT Dictionary Setup")
    print("="*60)
    
    # 下载字典
    csv_file = download_ecdict()
    
    if not csv_file:
        print("\n❌ Setup failed!")
        sys.exit(1)
    
    print("\n✓ Download complete!")
    print(f"\nNext step: Run the conversion script")
    print(f"  python convert_ecdict.py")
    
    # 询问是否立即转换
    response = input("\nConvert now? (Y/n): ").strip().lower()
    if response != 'n':
        print("\n" + "="*60)
        print("Starting conversion...")
        print("="*60)
        
        # 导入并运行转换脚本
        try:
            from convert_ecdict import convert_ecdict_to_json
            
            output_file = '../frontend/public/dictionaries/core-10000.json'
            count = convert_ecdict_to_json(csv_file, output_file, max_words=10000)
            
            if count > 0:
                print("\n✓ Setup complete!")
                print("\nYour dictionary is ready to use!")
        except ImportError:
            print("\n❌ convert_ecdict.py not found")
            print("Please run: python convert_ecdict.py")
