"""L3 9:16 short: Legenda Asal-usul Nama 'Bandung' dari Banda dan Ng (~75-80 detik).

Etimologi rakyat Sunda: 'banda' (bendungan) + 'ng' — jejak danau purba & Sangkuriang. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-bandung"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#0F1410"
GOLD = "#CA8A04"
GREEN = "#166534"
MIST = "#64748B"
AMBER = "#D97706"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "bandung city skyline mountain mist vertical cinematic",
            "java west highland city aerial vertical cinematic",
            "bandung valley mountains fog morning vertical cinematic",
            "indonesia highland cityscape dusk vertical cinematic",
        ],
        image_queries=[
            "bandung city skyline mountains mist landscape",
            "bandung highland valley aerial landscape indonesia",
        ],
        narration=(
            "Di dataran tinggi Jawa Barat, ada kota yang namanya terdengar modern. "
            "Tapi di baliknya tersimpan kata lama: Banda dan Ng. "
            "Dari dua potongan itu, lahir nama Bandung."
        ),
        overlay={
            "type": "hero_title",
            "text": "BANDUNG",
            "subtitle": "Asal-usul nama dari Banda & Ng",
        },
    ),
    Scene(
        id="dataran",
        video_queries=[
            "highland plateau mountains mist aerial vertical cinematic",
            "west java mountain valley fog morning vertical cinematic",
            "volcanic highland landscape indonesia vertical cinematic",
            "green plateau surrounded by mountains vertical cinematic",
        ],
        image_queries=[
            "west java highland plateau mountains mist landscape",
            "bandung basin volcanic highland aerial landscape",
        ],
        narration=(
            "Dulu kawasan ini cekungan luas di antara gunung. "
            "Kabut pagi, lembah hijau, dan jejak air purba. "
            "Orang Sunda menyebut tempat menurut apa yang mereka lihat."
        ),
        overlay={
            "type": "section_title",
            "text": "Cekungan",
            "subtitle": "Gunung · kabut · air purba",
            "accentColor": MIST,
        },
    ),
    Scene(
        id="banda",
        video_queries=[
            "dam reservoir lake mountain aerial vertical cinematic",
            "stone embankment water barrier historical vertical cinematic",
            "ancient dam wall water highland vertical cinematic",
            "large lake mountain basin aerial vertical cinematic",
        ],
        image_queries=[
            "mountain dam reservoir lake aerial landscape",
            "ancient embankment dam water highland landscape",
        ],
        narration=(
            "Banda berarti bendungan—penahan air yang membentuk genangan besar. "
            "Dalam legenda, bendungan itulah yang menahan air di cekungan ini. "
            "Tanpa banda, tak ada danau di dataran tinggi."
        ),
        overlay={
            "type": "section_title",
            "text": "Banda",
            "subtitle": "Bendungan · penahan · genangan",
            "accentColor": GREEN,
        },
    ),
    Scene(
        id="ng",
        video_queries=[
            "sundanese traditional village highland vertical cinematic",
            "old parchment writing calligraphy vertical cinematic",
            "java west traditional culture documentary vertical cinematic",
            "misty highland path morning vertical cinematic",
        ],
        image_queries=[
            "sundanese highland village traditional landscape",
            "old manuscript calligraphy parchment indonesia",
        ],
        narration=(
            "Ng adalah jejak bunyi Sunda yang melekat di ujung kata. "
            "Bukan sekadar huruf—ia menandai tempat, keadaan, dan nama. "
            "Banda digabung Ng, menjadi Bandung."
        ),
        overlay={
            "type": "section_title",
            "text": "Ng",
            "subtitle": "Bunyi Sunda · tempat · nama",
            "accentColor": AMBER,
        },
    ),
    Scene(
        id="danau",
        video_queries=[
            "ancient lake mountain basin aerial vertical cinematic",
            "flooded valley water mountains dramatic vertical cinematic",
            "large highland lake mist sunrise vertical cinematic",
            "broken dam water rushing dramatic vertical cinematic",
        ],
        image_queries=[
            "ancient highland lake mountain basin landscape",
            "flooded valley water mountains dramatic landscape",
        ],
        narration=(
            "Konon air menggenang jadi Danau Bandung purba. "
            "Lalu bendungan jebol—air surut, tanah muncul, "
            "dan cekungan itu jadi tempat tinggal manusia."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Banda + Ng",
            "subtitle": "Bendungan · bunyi Sunda · nama kota",
            "statFontSize": 56,
            "accentColor": GOLD,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="nama",
        video_queries=[
            "old map parchment java west vintage vertical cinematic",
            "colonial era city street historical vertical cinematic",
            "bandung old building architecture vertical cinematic",
            "vintage document handwriting map vertical cinematic",
        ],
        image_queries=[
            "old map west java parchment vintage landscape",
            "bandung colonial architecture historical building",
        ],
        narration=(
            "Nama itu menempel di lidah: Bandung—tempat yang dulu dibendung. "
            "Dari legenda air dan bendungan, "
            "jadi nama kota yang kita kenal hari ini."
        ),
        overlay={
            "type": "section_title",
            "text": "Nama Menempel",
            "subtitle": "Legenda · peta · kota",
            "accentColor": GOLD,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "bandung city night lights mountain vertical cinematic",
            "bandung skyline dusk golden hour vertical cinematic",
            "modern highland city mountains sunset vertical cinematic",
            "peaceful bandung park cityscape vertical cinematic",
        ],
        image_queries=[
            "bandung city night lights mountains landscape",
            "bandung skyline dusk golden hour landscape indonesia",
        ],
        narration=(
            "Kini Bandung adalah kota kreatif di atas bekas danau. "
            "Tapi setiap kali nama itu disebut, "
            "masih terdengar echo Banda dan Ng—jejak air yang menamai kota."
        ),
        overlay={
            "type": "section_title",
            "text": "Kota di Bekas Danau",
            "subtitle": "Banda · Ng · Bandung",
            "accentColor": GREEN,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="BANDUNG",
        subtitle="Asal-usul Nama dari Banda & Ng",
        scenes=list(SCENES),
        project_dir=PROJECT,
        deep_color=DEEP,
        accent_color=GOLD,
        highlight_color=GREEN,
        channel_end_color=GOLD,
        target_narration_seconds=75.0,
        max_narration_seconds=90.0,
        bed_mode="ambient",
        ambient_query=(
            "soft mountain mist highland calm atmosphere "
            "gentle cool air ambience warm neutral minimal"
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
