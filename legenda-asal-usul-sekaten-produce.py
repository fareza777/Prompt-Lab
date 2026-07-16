"""L3 9:16 short: Legenda Asal-usul Tradisi Sekaten di Yogyakarta (~75-80 detik).

Dari syiar Islam Demak/Mataram, gamelan Sekati, hingga pasar malam alun-alun. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-sekaten"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#140F0A"
GOLD = "#CA8A04"
CRIMSON = "#B91C1C"
BRASS = "#B45309"
CREAM = "#A8A29E"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "yogyakarta sultan palace keraton exterior vertical cinematic",
            "alun alun yogyakarta night market lights vertical cinematic",
            "java traditional festival night crowd vertical cinematic",
            "indonesian royal palace courtyard night vertical cinematic",
        ],
        image_queries=[
            "yogyakarta keraton sultan palace exterior landscape",
            "alun alun yogyakarta night festival market landscape",
        ],
        narration=(
            "Setiap tahun di Yogyakarta, alun-alun hidup dengan lampu, gamelan, dan keramaian. "
            "Tradisi itu disebut Sekaten. "
            "Tapi di baliknya, ada sejarah syiar yang lebih tua dari pasar malam."
        ),
        overlay={
            "type": "hero_title",
            "text": "SEKATEN",
            "subtitle": "Asal-usul tradisi di Yogyakarta",
        },
    ),
    Scene(
        id="syiar",
        video_queries=[
            "mosque dome indonesia golden hour vertical cinematic",
            "islamic calligraphy parchment manuscript vertical cinematic",
            "java historical kingdom courtyard documentary vertical cinematic",
            "old mosque courtyard peaceful vertical cinematic",
        ],
        image_queries=[
            "indonesia mosque dome golden hour landscape",
            "islamic manuscript calligraphy parchment historical",
        ],
        narration=(
            "Konon tradisi ini berawal dari masa penyebaran Islam di Jawa. "
            "Wali dan raja memakai cara yang akrab di telinga rakyat: "
            "musik, keramaian, dan perayaan—bukan sekadar ceramah."
        ),
        overlay={
            "type": "section_title",
            "text": "Syiar",
            "subtitle": "Islam · Jawa · cara akrab",
            "accentColor": GOLD,
        },
    ),
    Scene(
        id="syahadat",
        video_queries=[
            "old arabic manuscript parchment writing vertical cinematic",
            "mosque interior soft light prayer vertical cinematic",
            "vintage religious book pages closeup vertical cinematic",
            "peaceful islamic architecture archway vertical cinematic",
        ],
        image_queries=[
            "arabic manuscript parchment islamic writing historical",
            "mosque interior soft light architecture peaceful",
        ],
        narration=(
            "Nama Sekaten diyakini dari syahadatain—dua kalimat syahadat. "
            "Perayaan jadi undangan: datang, dengar, dan kenal ajaran baru. "
            "Kata suci berubah jadi nama tradisi yang meriah."
        ),
        overlay={
            "type": "section_title",
            "text": "Syahadatain",
            "subtitle": "Dua kalimat · jadi nama · undangan",
            "accentColor": CRIMSON,
        },
    ),
    Scene(
        id="gamelan",
        video_queries=[
            "javanese gamelan orchestra performance vertical cinematic",
            "traditional bronze gong gamelan closeup vertical cinematic",
            "javanese musicians gamelan palace vertical cinematic",
            "gamelan instruments metal gongs documentary vertical",
        ],
        image_queries=[
            "javanese gamelan orchestra bronze instruments landscape",
            "traditional gamelan gong closeup indonesia cultural",
        ],
        narration=(
            "Gamelan Sekati dibunyikan di pelataran masjid dan keraton. "
            "Suara gong memanggil orang dari desa ke alun-alun. "
            "Musik jadi jembatan antara istana, iman, dan rakyat."
        ),
        overlay={
            "type": "section_title",
            "text": "Gamelan Sekati",
            "subtitle": "Gong · panggilan · jembatan",
            "accentColor": BRASS,
        },
    ),
    Scene(
        id="mataram",
        video_queries=[
            "yogyakarta keraton palace architecture vertical cinematic",
            "javanese royal ceremony traditional vertical cinematic",
            "sultan palace courtyard procession vertical cinematic",
            "traditional java court culture documentary vertical",
        ],
        image_queries=[
            "yogyakarta keraton palace architecture historical landscape",
            "javanese royal ceremony traditional court culture",
        ],
        narration=(
            "Di Kasultanan Yogyakarta, Sekaten digelar tiap Maulid Nabi. "
            "Bukan hanya hiburan—ia warisan istana yang menjaga "
            "ingatan syiar dan wibawa keraton."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Maulid",
            "subtitle": "Keraton · gamelan · syahadatain",
            "statFontSize": 72,
            "accentColor": GOLD,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="pasar",
        video_queries=[
            "night market food stalls indonesia vertical cinematic",
            "traditional fair festival lights crowd vertical cinematic",
            "javanese night bazaar colorful stalls vertical cinematic",
            "street food market night asia vertical cinematic",
        ],
        image_queries=[
            "indonesia night market food stalls festival lights",
            "traditional night fair bazaar crowd colorful landscape",
        ],
        narration=(
            "Lama-kelamaan, di sekelilingnya tumbuh pasar malam: "
            "dagangan, jajanan, dan tontonan. "
            "Syiar yang dulu sunyi jadi keramaian yang dinanti setiap tahun."
        ),
        overlay={
            "type": "section_title",
            "text": "Pasar Malam",
            "subtitle": "Dagangan · jajanan · keramaian",
            "accentColor": CREAM,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "yogyakarta city night lights palace vertical cinematic",
            "alun alun night festival peaceful vertical cinematic",
            "java traditional culture celebration dusk vertical cinematic",
            "mosque and palace skyline night indonesia vertical cinematic",
        ],
        image_queries=[
            "yogyakarta night city lights keraton landscape",
            "alun alun yogyakarta festival night peaceful landscape",
        ],
        narration=(
            "Sekaten adalah jejak: iman yang datang lewat gamelan, "
            "raja yang merangkul rakyat, dan kota yang merayakan Maulid "
            "dengan cara Jawa—meriah, sakral, dan tak pernah pudar."
        ),
        overlay={
            "type": "section_title",
            "text": "Warisan Jogja",
            "subtitle": "Iman · gamelan · keramaian",
            "accentColor": GOLD,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="SEKATEN",
        subtitle="Asal-usul Tradisi di Yogyakarta",
        scenes=list(SCENES),
        project_dir=PROJECT,
        deep_color=DEEP,
        accent_color=GOLD,
        highlight_color=CRIMSON,
        channel_end_color=GOLD,
        target_narration_seconds=75.0,
        max_narration_seconds=90.0,
        bed_mode="ambient",
        ambient_query=(
            "soft traditional courtyard night calm atmosphere "
            "gentle distant festival ambience warm neutral minimal"
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
