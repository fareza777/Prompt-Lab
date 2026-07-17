"""L3 9:16 short: Legenda Asal-usul Nama 'Makassar' dari 'Mangkasara' (~75-85 detik).

Etimologi Bugis-Makassar: Mangkasara / Mangkasarak — orang yang terbuka, tegas, pelaut. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-makassar"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#0A1218"
GOLD = "#CA8A04"
SEA = "#0EA5E9"
TEAL = "#0F766E"
STONE = "#78716C"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "makassar city coastline aerial vertical cinematic",
            "sulawesi south port city aerial vertical cinematic",
            "indonesia coastal city harbor sunset vertical cinematic",
            "losari beach makassar skyline vertical cinematic",
        ],
        image_queries=[
            "makassar city coastline aerial landscape indonesia",
            "makassar harbor skyline losari beach landscape",
        ],
        narration=(
            "Di ujung selatan Sulawesi, ada kota yang namanya terdengar tegas: Makassar. "
            "Asalnya bukan dari peta Eropa semata— "
            "melainkan dari kata lokal: Mangkasara."
        ),
        overlay={
            "type": "hero_title",
            "text": "MAKASSAR",
            "subtitle": "Asal-usul nama dari Mangkasara",
        },
    ),
    Scene(
        id="mangkasara",
        video_queries=[
            "old parchment writing calligraphy vertical cinematic",
            "traditional language manuscript asia vertical cinematic",
            "historical document ink handwriting vertical cinematic",
            "ancient map southeast asia parchment vertical cinematic",
        ],
        image_queries=[
            "old parchment calligraphy manuscript historical",
            "southeast asia historical map parchment landscape",
        ],
        narration=(
            "Mangkasara—atau Mangkasarak—adalah sebutan orang setempat. "
            "Bukan label asing, melainkan nama yang hidup di lidah Bugis-Makassar. "
            "Dari situ lahir ejaan yang kita kenal hari ini."
        ),
        overlay={
            "type": "section_title",
            "text": "Mangkasara",
            "subtitle": "Lokal · lidah · jadi nama",
            "accentColor": GOLD,
        },
    ),
    Scene(
        id="arti",
        video_queries=[
            "open ocean horizon sunrise vertical cinematic",
            "honest face portrait documentary calm vertical cinematic",
            "coastal wind flags dramatic vertical cinematic",
            "clear blue sea surface aerial vertical cinematic",
        ],
        image_queries=[
            "open ocean horizon sunrise landscape cinematic",
            "clear blue sea surface aerial landscape",
        ],
        narration=(
            "Konon arti Mangkasara dekat dengan sifat: terbuka, tegas, apa adanya. "
            "Orang yang tidak berbelit—seperti laut yang jernih di depan pelabuhan. "
            "Nama kota membawa watak penghuninya."
        ),
        overlay={
            "type": "section_title",
            "text": "Arti",
            "subtitle": "Terbuka · tegas · apa adanya",
            "accentColor": SEA,
        },
    ),
    Scene(
        id="pelaut",
        video_queries=[
            "traditional pinisi sailing ship ocean vertical cinematic",
            "wooden sailing boat sulawesi sea vertical cinematic",
            "fishermen harbor traditional boats vertical cinematic",
            "sailing ship ocean waves dramatic vertical cinematic",
        ],
        image_queries=[
            "pinisi traditional sailing ship ocean indonesia",
            "sulawesi wooden boat harbor fishermen landscape",
        ],
        narration=(
            "Makassar adalah kota pelaut dan niaga. "
            "Kapal pinisi, rempah, dan jalur dagang menautkannya ke nusantara. "
            "Nama Mangkasara menempel di peta karena bandar itu hidup."
        ),
        overlay={
            "type": "section_title",
            "text": "Pelaut",
            "subtitle": "Pinisi · niaga · bandar",
            "accentColor": TEAL,
        },
    ),
    Scene(
        id="kerajaan",
        video_queries=[
            "historical fort coastline indonesia vertical cinematic",
            "old royal palace courtyard asia vertical cinematic",
            "fort rotterdam makassar historical vertical cinematic",
            "colonial fort harbor sunset vertical cinematic",
        ],
        image_queries=[
            "historical fort coastline indonesia landscape",
            "fort rotterdam makassar historical architecture",
        ],
        narration=(
            "Kerajaan Gowa-Tallo menjadikan kawasan ini pusat kuasa. "
            "Lalu orang luar menulis Mangkasara dengan ejaan mereka— "
            "hingga jadi Makassar di dokumen dan peta."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Mangkasara",
            "subtitle": "Lokal · peta · jadi Makassar",
            "statFontSize": 52,
            "accentColor": GOLD,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="kota",
        video_queries=[
            "busy coastal city market asia vertical cinematic",
            "makassar urban street life vertical cinematic",
            "modern indonesia city harbor dusk vertical cinematic",
            "city waterfront promenade sunset vertical cinematic",
        ],
        image_queries=[
            "makassar urban coastal city street landscape",
            "indonesia city waterfront promenade sunset landscape",
        ],
        narration=(
            "Dari bandar lama, tumbuh kota modern di tepi Selat Makassar. "
            "Losari, pelabuhan, dan lalu lintas—wajah baru di atas nama lama. "
            "Tapi akar katanya tetap Mangkasara."
        ),
        overlay={
            "type": "section_title",
            "text": "Kota Tepi Selat",
            "subtitle": "Bandar · modern · akar lama",
            "accentColor": STONE,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "makassar sunset harbor golden hour vertical cinematic",
            "sulawesi coastline dusk aerial vertical cinematic",
            "indonesia port city night lights vertical cinematic",
            "peaceful ocean city skyline evening vertical cinematic",
        ],
        image_queries=[
            "makassar sunset harbor golden hour landscape",
            "sulawesi coastline dusk aerial city landscape",
        ],
        narration=(
            "Makassar hari ini adalah ibu kota Sulawesi Selatan. "
            "Di balik ejaan modern, masih terdengar Mangkasara— "
            "nama yang lahir dari watak terbuka dan laut yang luas."
        ),
        overlay={
            "type": "section_title",
            "text": "Nama yang Tinggal",
            "subtitle": "Mangkasara · laut · kota",
            "accentColor": GOLD,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="MAKASSAR",
        subtitle="Asal-usul Nama dari Mangkasara",
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
            "soft coastal harbor wind calm atmosphere "
            "gentle ocean port ambience warm neutral minimal"
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
