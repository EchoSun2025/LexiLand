import json

# Load the 50000-word dictionary
with open('../frontend/public/dictionaries/core-50000.json', 'r', encoding='utf-8') as f:
    dictionary = json.load(f)

# Check if 'dazzle' is there
if 'dazzle' in dictionary:
    print("dazzle IS in the dictionary!")
else:
    print("dazzle is NOT in the dictionary")
    
# Check some random words and see if they should be lower priority than dazzle
test_words = ['arthas', 'arthiconoscope', 'govern', 'the', 'walk']
for word in test_words:
    if word in dictionary:
        entry = dictionary[word]
        print(f"\n{word}:")
        print(f"  Level: {entry.get('level', 'N/A')}")
        print(f"  Chinese: {entry.get('chinese', 'N/A')[:20]}")
