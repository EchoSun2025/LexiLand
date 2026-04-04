"""
测试翻译精简功能
"""
import sys
sys.path.append('.')
from convert_ecdict import simplify_translation

# 测试用例
test_cases = [
    ("art. 这个；那个；这些；那些", "这个"),
    ("v. 有；拥有；持有；占有", "有"),
    ("adj. 美丽的；美好的；出色的", "美丽的"),
    ("adv. 迅速地；很快地", "迅速地"),
    ("prep. 和；用；随着", "和"),
    ("n. 调查；研究；审查", "调查"),
    ("美丽的；漂亮的", "美丽的"),  # 没有词性标记
    ("快速（地）；迅速", "快速"),  # 带括号
    ("prep. 在...上面；关于", "在...上面"),  # 带省略号
]

print("测试翻译精简功能")
print("=" * 60)

passed = 0
failed = 0

for original, expected in test_cases:
    result = simplify_translation(original)
    status = "OK" if result == expected else "FAIL"
    
    if result == expected:
        passed += 1
    else:
        failed += 1
    
    print(f"{status} 原始: {original}")
    print(f"  期望: {expected}")
    print(f"  结果: {result}")
    print()

print("=" * 60)
print(f"测试结果: {passed} 通过, {failed} 失败")

if failed == 0:
    print("\nOK 所有测试通过！精简功能正常工作。")
else:
    print(f"\nFAIL 有 {failed} 个测试失败，请检查 simplify_translation() 函数。")
