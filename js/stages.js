const STAGES = [
    {
        "id": 1,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 1 (필기인식_한칸입력_입력창)",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 220,
                "height": 120
            }
        ],
        "bgImage": "images/Beginning_All About Me_My Face_Lesson 1_P1.png"
    },
    {
        "id": 2,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 2 (필기인식_두칸입력_입력창)",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 140,
                "height": 121
            },
            {
                "x": 600,
                "y": 340,
                "width": 140,
                "height": 121
            }
        ],
        "bgImage": "images/20260105_193944.png"
    },
    {
        "id": 3,
        "type": "hint_audio",
        "inputType": "direct",
        "title": "Level 3 (필기인식_직접입력)",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 140,
                "height": 120
            },
            {
                "x": 600,
                "y": 340,
                "width": 140,
                "height": 120
            }
        ],
        "hintText": [
            "학",
            "교"
        ],
        "audioWord": "학교",
        "maxAudioPlays": 2
    },
    {
        "id": 5,
        "type": "blink_pad",
        "inputType": "pad",
        "title": "Level 5 (필기인식_하이라이트_입력창)",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 140,
                "height": 120
            },
            {
                "x": 600,
                "y": 340,
                "width": 140,
                "height": 120
            }
        ]
    },
    {
        "id": 6,
        "type": "drag_drop",
        "inputType": "drag",
        "title": "Level 6 (드래그드랍_병음한자 01)",
        "subText": "당신은 밥을 먹었습니까?",
        "tokens": [
            {
                "char": "你",
                "pinyin": "Nǐ",
                "fixed": true
            },
            {
                "char": "吃",
                "pinyin": "chī",
                "fixed": false
            },
            {
                "char": "饭",
                "pinyin": "fàn",
                "fixed": true
            },
            {
                "char": "了",
                "pinyin": "le",
                "fixed": false
            },
            {
                "char": "吗",
                "pinyin": "ma",
                "fixed": false
            }
        ],
        "sourceItems": [
            "ma",
            "chī",
            "le"
        ]
    },
    {
        "id": 7,
        "type": "alphabet_drag",
        "inputType": "drag",
        "title": "Level 7 (드래그 드랍_캐릭터 피드백)",
        "bgImage": "images/cruise ship.png",
        "feedback": {
            "boy": "images/boy-1.png",
            "girl": "images/girl-1.png"
        },
        "targets": [
            {
                "x": 297,
                "y": 385,
                "char": "a",
                "fixed": true
            },
            {
                "x": 454,
                "y": 385,
                "char": "b",
                "fixed": false
            },
            {
                "x": 607,
                "y": 385,
                "char": "c",
                "fixed": true
            },
            {
                "x": 758,
                "y": 385,
                "char": "d",
                "fixed": true
            },
            {
                "x": 934,
                "y": 385,
                "char": "e",
                "fixed": true
            },
            {
                "x": 1090,
                "y": 385,
                "char": "f",
                "fixed": true
            },
            {
                "x": 1215,
                "y": 385,
                "char": "g",
                "fixed": true
            }
        ],
        "sourceItems": [
            {
                "char": "h",
                "x": 420,
                "y": 750
            },
            {
                "char": "b",
                "x": 640,
                "y": 750
            },
            {
                "char": "r",
                "x": 860,
                "y": 750
            }
        ]
    },
    {
        "id": 10,
        "type": "speech_recognition",
        "inputType": "none",
        "title": "Level 10 (음성인식_중국어 01)",
        "text": "你吃什么了?",
        "subText": "Nǐ chī  sheme le?",
        "meaning": "밥 뭐 먹었니?",
        "lang": "zh-CN"
    },
    {
        "id": 11,
        "type": "speech_recognition",
        "inputType": "none",
        "title": "Level 11 (음성인식_일본어 01)",
        "text": "食べましたか？",
        "subText": "tabemashita ka?",
        "meaning": "먹었나요?",
        "lang": "ja-JP"
    },
    {
        "id": 12,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 12 (hanja a52)",
        "sentence": {
            "pre": " ",
            "post": " ",
            "y": 400
        },
        "targets": [
            {
                "x": 524,
                "y": 459,
                "width": 136,
                "height": 61
            },
            {
                "x": 439,
                "y": 511,
                "width": 58,
                "height": 55
            }
        ],
        "bgImage": "images/교재png/20260109_171534.png",
        "padOpacity": 0.6,
        "padColor": "#e7f2e3"
    },
    {
        "id": 13,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 13",
        "sentence": {
            "pre": " ",
            "post": " ",
            "y": 400
        },
        "targets": [
            {
                "x": 559,
                "y": 631,
                "width": 71,
                "height": 65
            },
            {
                "x": 449,
                "y": 173,
                "width": 140,
                "height": 120
            },
            {
                "x": 730,
                "y": 571,
                "width": 58,
                "height": 50
            }
        ],
        "bgImage": "images/교재png/20260109_171356.png",
        "padOpacity": 0.2
    },
    {
        "id": 14,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 14",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 220,
                "height": 120
            }
        ],
        "bgImage": "images/교재png/20260109_171936.png"
    },
    {
        "id": 15,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 15",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 479,
                "y": 382,
                "width": 244,
                "height": 49
            }
        ],
        "bgImage": "images/교재png/20260109_171633.png"
    },
    {
        "id": 16,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 16",
        "sentence": {
            "pre": "x",
            "post": "x",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 220,
                "height": 120
            }
        ],
        "bgImage": "images/교재png/20260109_172127.png"
    },
    {
        "id": 17,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 17",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 220,
                "height": 120
            }
        ],
        "bgImage": "images/교재png/20260109_172027.png"
    },
    {
        "id": 18,
        "type": "normal",
        "inputType": "pad",
        "title": "Level 18",
        "sentence": {
            "pre": "나는",
            "post": "에 갑니다.",
            "y": 400
        },
        "targets": [
            {
                "x": 440,
                "y": 340,
                "width": 220,
                "height": 120
            }
        ],
        "bgImage": "images/교재png/20260109_172146.png"
    }
];