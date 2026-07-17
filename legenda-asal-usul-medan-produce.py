"""L3 9:16 short: Legenda Asal-usul Nama 'Medan' dari 'Medan Perang' (~75-85 detik).

Etimologi rakyat: medan = lapangan/pertempuran; jejak Deli & kota di Sumatera Utara. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-medan"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#0C1014"
GOLD = "#CA8A04"
GREEN = "#166534"
STONE = "#78716C"
RED = "#B91C1C"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "medan city skyline indonesia aerial vertical cinematic",
            "sumatra north cityscape dusk aerial vertical cinematic",
            "indonesian city busy street aerial vertical cinematic",
            "modern city river bridge indonesia vertical cinematic",
        ],
        image_queries=[
            "medan city skyline aerial landscape indonesia",
            "medan sumatra urban cityscape landscape",
        ],
        narration=(
            "Di Sumatera Utara, ada kota besar bernama Medan. "
            "Namanya terdengar biasa—padahal di baliknya ada kata medan perang. "
            "Lapangan terbuka yang dulu jadi tempat bentrok dan sejarah."
        ),
        overlay={
            "type": "hero_title",
            "text": "MEDAN",
            "subtitle": "Asal-usul nama dari Medan Perang",
        },
    ),
    Scene(
        id="arti",
        video_queries=[
            "open plain field grassland aerial vertical cinematic",
            "empty battlefield plain fog dramatic vertical cinematic",
            "wide flat land horizon mist vertical cinematic",
            "open field dust wind dramatic vertical cinematic",
        ],
        image_queries=[
            "open plain grassland field aerial landscape",
            "empty battlefield plain fog dramatic landscape",
        ],
        narration=(
            "Dalam bahasa Melayu dan Indonesia, medan berarti lapangan atau arena. "
            "Medan perang adalah tempat dua pihak saling berhadapan. "
            "Bukan gedung, melainkan tanah terbuka yang menanggung jejak pertempuran."
        ),
        overlay={
            "type": "section_title",
            "text": "Medan",
            "subtitle": "Lapangan · arena · perang",
            "accentColor": STONE,
        },
    ),
    Scene(
        id="deli",
        video_queries=[
            "sumatra river tropical landscape aerial vertical cinematic",
            "historical malay kingdom palace courtyard vertical cinematic",
            "old trading port southeast asia vertical cinematic",
            "tropical lowland river settlement aerial vertical cinematic",
        ],
        image_queries=[
            "sumatra river tropical lowland aerial landscape",
            "historical malay kingdom courtyard landscape",
        ],
        narration=(
            "Kawasan ini dulu terkait Kesultanan Deli dan jalur dagang timur Sumatera. "
            "Tanah datar di antara sungai jadi tempat berkumpul, berdagang, "
            "dan kadang bentrok kepentingan."
        ),
        overlay={
            "type": "section_title",
            "text": "Deli",
            "subtitle": "Kesultanan · sungai · jalur dagang",
            "accentColor": GREEN,
        },
    ),
    Scene(
        id="perang",
        video_queries=[
            "ancient warriors clash dramatic dust vertical cinematic",
            "historical battle reenactment smoke vertical cinematic",
            "dramatic war drums army march vertical cinematic",
            "battlefield smoke fog soldiers silhouette vertical cinematic",
        ],
        image_queries=[
            "ancient battle warriors dust dramatic landscape",
            "battlefield smoke fog soldiers silhouette landscape",
        ],
        narration=(
            "Legenda rakyat menyebut ada pertempuran di lapangan luas itu. "
            "Orang menamai tempat menurut apa yang terjadi: medan perang. "
            "Nama tempat lahir dari memori konflik, bukan dari pujian istana."
        ),
        overlay={
            "type": "section_title",
            "text": "Medan Perang",
            "subtitle": "Bentrok · memori · nama tempat",
            "accentColor": RED,
        },
    ),
    Scene(
        id="nama",
        video_queries=[
            "old map parchment southeast asia vintage vertical cinematic",
            "colonial era city street historical vertical cinematic",
            "vintage document handwriting map vertical cinematic",
            "old city gate historical asia vertical cinematic",
        ],
        image_queries=[
            "old parchment map sumatra vintage landscape",
            "colonial era historical city street asia",
        ],
        narration=(
            "Lama-kelamaan, frasa itu dipendekkan. "
            "Medan Perang jadi Medan—lebih ringkas di lidah, "
            "tapi jejak artinya tetap: lapangan yang pernah jadi arena."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Medan Perang",
            "subtitle": "Lapangan · bentrok · jadi nama kota",
            "statFontSize": 48,
            "accentColor": GOLD,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="kota",
        video_queries=[
            "busy asian city market street vertical cinematic",
            "medan indonesia urban life street vertical cinematic",
            "multicultural city street asia vertical cinematic",
            "modern city growth skyline dusk vertical cinematic",
        ],
        image_queries=[
            "busy asian city market street urban landscape",
            "medan urban multicultural city street indonesia",
        ],
        narration=(
            "Di masa kolonial dan sesudahnya, Medan tumbuh jadi kota dagang. "
            "Pasar, kebun, dan imigran membentuk wajah baru. "
            "Tapi nama lama tetap menempel di peta."
        ),
        overlay={
            "type": "section_title",
            "text": "Kota Tumbuh",
            "subtitle": "Dagang · kebun · peta",
            "accentColor": GOLD,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "medan city night lights skyline vertical cinematic",
            "modern indonesian city dusk golden hour vertical cinematic",
            "sumatra city aerial sunset peaceful vertical cinematic",
            "city park monument urban indonesia vertical cinematic",
        ],
        image_queries=[
            "medan city night lights skyline landscape",
            "sumatra city aerial sunset urban landscape indonesia",
        ],
        narration=(
            "Hari ini Medan adalah metropolis Sumatera Utara. "
            "Di balik gedung dan lalu lintas, "
            "masih ada echo medan perang—nama yang lahir dari tanah terbuka dan sejarah."
        ),
        overlay={
            "type": "section_title",
            "text": "Nama yang Tinggal",
            "subtitle": "Lapangan · sejarah · kota",
            "accentColor": GREEN,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="MEDAN",
        subtitle="Asal-usul Nama dari Medan Perang",
        scenes=list(SCENES),
        project_dir=PROJECT,
        deep_color=DEEP,
        accent_color=GOLD,
        highlight_color=RED,
        channel_end_color=GOLD,
        target_narration_seconds=75.0,
        max_narration_seconds=90.0,
        bed_mode="ambient",
        ambient_query=(
            "soft open plain wind calm atmosphere "
            "gentle distant city air ambience warm neutral minimal"
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
