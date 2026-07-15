"""L3 9:16 short: Legenda Asal-usul Nama 'Surabaya' dari Sura dan Baya (~75-80 detik).

Cerita rakyat Jawa Timur: pertarungan hiu Sura dan buaya Baya di muara. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-surabaya"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#0A1218"
GOLD = "#CA8A04"
SEA = "#0EA5E9"
TEAL = "#0D9488"
RED = "#DC2626"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "surabaya city skyline aerial vertical cinematic",
            "java east coastal city harbor aerial vertical cinematic",
            "indonesia port city river mouth aerial vertical cinematic",
            "city monument shark crocodile statue vertical cinematic",
        ],
        image_queries=[
            "surabaya skyline aerial harbor landscape indonesia",
            "surabaya suro boyo statue monument landscape",
        ],
        narration=(
            "Di pesisir Jawa Timur, ada kota yang namanya lahir dari pertarungan. "
            "Bukan perang kerajaan—melainkan duel di muara sungai "
            "antara dua raja air: Sura dan Baya."
        ),
        overlay={
            "type": "hero_title",
            "text": "SURABAYA",
            "subtitle": "Asal-usul nama dari Sura & Baya",
        },
    ),
    Scene(
        id="muara",
        video_queries=[
            "river mouth ocean estuary aerial vertical cinematic",
            "coastal mangrove river delta indonesia vertical cinematic",
            "java coastline muddy estuary aerial vertical cinematic",
            "tropical river flowing into sea vertical cinematic",
        ],
        image_queries=[
            "river estuary mouth ocean aerial landscape indonesia",
            "java east coast mangrove river delta landscape",
        ],
        narration=(
            "Konon di muara Kali Mas, air tawar bertemu air asin. "
            "Wilayah itu jadi perbatasan dua dunia: sungai dan laut. "
            "Di situlah legenda Sura dan Baya bermula."
        ),
        overlay={
            "type": "section_title",
            "text": "Muara Kali Mas",
            "subtitle": "Sungai · laut · perbatasan",
            "accentColor": SEA,
        },
    ),
    Scene(
        id="sura",
        video_queries=[
            "shark swimming ocean underwater cinematic vertical",
            "great shark underwater blue ocean vertical cinematic",
            "shark silhouette deep ocean dramatic vertical cinematic",
            "underwater ocean predator fish vertical cinematic",
        ],
        image_queries=[
            "shark swimming underwater ocean blue dramatic",
            "shark silhouette deep sea underwater landscape",
        ],
        narration=(
            "Sura adalah hiu ganas penguasa laut. "
            "Ia merasa semua perairan—termasuk muara—miliknya. "
            "Siapa pun yang masuk wilayahnya harus tunduk."
        ),
        overlay={
            "type": "section_title",
            "text": "Sura",
            "subtitle": "Hiu · raja laut · ganas",
            "accentColor": SEA,
        },
    ),
    Scene(
        id="baya",
        video_queries=[
            "crocodile swimming river water cinematic vertical",
            "alligator crocodile riverbank tropical vertical cinematic",
            "crocodile eyes water surface dramatic vertical cinematic",
            "tropical river crocodile wild nature vertical cinematic",
        ],
        image_queries=[
            "crocodile swimming river tropical water dramatic",
            "crocodile riverbank indonesia wildlife landscape",
        ],
        narration=(
            "Baya adalah buaya besar penguasa sungai. "
            "Bagi Baya, muara adalah perpanjangan sungai—bukan wilayah laut. "
            "Dua raja air tak mau berbagi."
        ),
        overlay={
            "type": "section_title",
            "text": "Baya",
            "subtitle": "Buaya · raja sungai · kuat",
            "accentColor": TEAL,
        },
    ),
    Scene(
        id="perang",
        video_queries=[
            "stormy ocean waves crashing dramatic vertical cinematic",
            "turbulent river flood muddy water vertical cinematic",
            "dramatic water splash fight underwater vertical cinematic",
            "violent storm sea river mouth aerial vertical cinematic",
        ],
        image_queries=[
            "stormy ocean waves crashing dramatic landscape",
            "turbulent muddy river flood water landscape",
        ],
        narration=(
            "Mereka bertarung hebat di muara. "
            "Air bergolak, ombak memecah, dan pertarungan berlangsung berhari-hari. "
            "Tak ada yang mau mengalah—sampai keduanya hampir musnah."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Sura × Baya",
            "subtitle": "Duel di muara · tak ada yang mau kalah",
            "statFontSize": 52,
            "accentColor": RED,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="batas",
        video_queries=[
            "calm river mouth ocean peaceful aerial vertical cinematic",
            "estuary sunrise golden light aerial vertical cinematic",
            "peaceful coastline river delta morning vertical cinematic",
            "map boundary line river ocean documentary vertical",
        ],
        image_queries=[
            "calm river estuary ocean sunrise aerial landscape",
            "peaceful coastline river delta morning landscape",
        ],
        narration=(
            "Akhirnya mereka berdamai dengan satu perjanjian: "
            "laut milik Sura, sungai milik Baya. "
            "Muara jadi batas—dan dari nama keduanya lahirlah Surabaya."
        ),
        overlay={
            "type": "section_title",
            "text": "Perjanjian",
            "subtitle": "Laut · sungai · muara batas",
            "accentColor": GOLD,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "surabaya city night lights aerial vertical cinematic",
            "modern indonesian city skyline dusk vertical cinematic",
            "harbor city sunset indonesia aerial vertical cinematic",
            "city park monument shark crocodile vertical cinematic",
        ],
        image_queries=[
            "surabaya modern city skyline dusk landscape",
            "suro boyo statue surabaya park monument landscape",
        ],
        narration=(
            "Hingga kini, lambang kota mengabadikan Sura dan Baya. "
            "Bukan hanya dongeng—melainkan pengingat: "
            "dari konflik bisa lahir identitas, dan dari dua nama, satu kota."
        ),
        overlay={
            "type": "section_title",
            "text": "Kota Pahlawan",
            "subtitle": "Sura · Baya · identitas",
            "accentColor": GOLD,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="SURABAYA",
        subtitle="Asal-usul Nama dari Sura & Baya",
        scenes=list(SCENES),
        project_dir=PROJECT,
        deep_color=DEEP,
        accent_color=GOLD,
        highlight_color=SEA,
        channel_end_color=GOLD,
        target_narration_seconds=75.0,
        max_narration_seconds=90.0,
        bed_mode="ambient",
        ambient_query=(
            "soft water river ocean calm subtle atmosphere "
            "gentle coastal ambience warm neutral minimal"
        ),
        ai_video_fallback="none",
        ai_image_fallback="auto",
    )


def main() -> None:
    out = run_l3_explainer(config())
    dest = Path(r"C:\Users\FAJAR\Downloads") / f"{PROJECT_SLUG}-9x16-l3.mp4"
    shutil.copy2(out, dest)
    print(f"\nCopied to: {dest}")
    subprocess.run(["explorer", "/select,", str(dest)], check=False)


if __name__ == "__main__":
    main()
