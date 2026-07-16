"""L3 9:16 short: Legenda Asal-usul Tradisi Kuda Lumping / Jaran Kepang (~75-85 detik).

Kesenian rakyat Jawa: kuda anyaman, trance, semangat perang & kesuburan. Stock B-roll + ElevenLabs.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
PROJECT_SLUG = "legenda-asal-usul-kuda-lumping"

sys.path.insert(0, str(ROOT))

from lib.explainer_l3_pipeline import L3ProjectConfig, Scene, run_l3_explainer

DEEP = "#1A1008"
GOLD = "#CA8A04"
EARTH = "#92400E"
RED = "#B91C1C"
BAMBOO = "#A3A3A3"

SCENES: list[Scene] = [
    Scene(
        id="hook",
        video_queries=[
            "javanese traditional dance performance outdoor vertical cinematic",
            "indonesia folk dance festival village vertical cinematic",
            "traditional horse dance costume performance vertical cinematic",
            "java cultural dance crowd village square vertical cinematic",
        ],
        image_queries=[
            "kuda lumping jaran kepang traditional dance indonesia",
            "javanese folk dance festival village performance landscape",
        ],
        narration=(
            "Di desa-desa Jawa, ada tarian yang menunggang kuda tanpa kaki. "
            "Namanya Kuda Lumping—atau Jaran Kepang. "
            "Bukan sekadar hiburan: di baliknya ada legenda perang dan roh."
        ),
        overlay={
            "type": "hero_title",
            "text": "KUDA LUMPING",
            "subtitle": "Asal-usul tradisi Jaran Kepang",
        },
    ),
    Scene(
        id="anyaman",
        video_queries=[
            "bamboo weaving craft hands closeup vertical cinematic",
            "woven bamboo craft traditional indonesia vertical cinematic",
            "handmade woven horse toy traditional vertical cinematic",
            "village craftsman weaving bamboo vertical cinematic",
        ],
        image_queries=[
            "bamboo weaving traditional craft indonesia landscape",
            "woven bamboo horse jaran kepang craft cultural",
        ],
        narration=(
            "Kudanya terbuat dari anyaman bambu dan kulit. "
            "Ringan, pipih, digenggam di pinggang penari. "
            "Dari situlah nama lumping—lembaran—dan kepang: anyaman."
        ),
        overlay={
            "type": "section_title",
            "text": "Anyaman",
            "subtitle": "Bambu · kulit · kuda pipih",
            "accentColor": BAMBOO,
        },
    ),
    Scene(
        id="perang",
        video_queries=[
            "ancient warrior army march dramatic vertical cinematic",
            "historical battle reenactment cavalry vertical cinematic",
            "javanese warrior silhouette dramatic vertical cinematic",
            "dramatic dust battlefield horses running vertical cinematic",
        ],
        image_queries=[
            "ancient warrior army dramatic landscape historical",
            "javanese warrior silhouette dramatic dust landscape",
        ],
        narration=(
            "Konon kesenian ini lahir dari semangat prajurit Mataram. "
            "Saat kuda sungguhan kurang, pasukan menunggang kuda anyaman. "
            "Latihan perang berubah jadi tarian yang hidup di desa."
        ),
        overlay={
            "type": "section_title",
            "text": "Prajurit",
            "subtitle": "Mataram · latihan · jadi tarian",
            "accentColor": EARTH,
        },
    ),
    Scene(
        id="trance",
        video_queries=[
            "dramatic ritual fire smoke night vertical cinematic",
            "intense traditional dance trance performance vertical cinematic",
            "shamanic ritual smoke incense night vertical cinematic",
            "mystical night ceremony indonesia vertical cinematic",
        ],
        image_queries=[
            "ritual fire smoke night ceremony dramatic landscape",
            "traditional trance dance performance mystical indonesia",
        ],
        narration=(
            "Dalam pementasan, penari bisa kerasukan—ndadi. "
            "Mereka menari liar, makan beling, atau meniru kuda. "
            "Bagi masyarakat, itu bukan main-main: tubuh jadi wadah roh."
        ),
        overlay={
            "type": "section_title",
            "text": "Ndadi",
            "subtitle": "Trance · roh · tubuh wadah",
            "accentColor": RED,
        },
    ),
    Scene(
        id="makna",
        video_queries=[
            "village harvest festival celebration vertical cinematic",
            "rural java village ceremony community vertical cinematic",
            "traditional offering flowers incense vertical cinematic",
            "community gathering village square indonesia vertical cinematic",
        ],
        image_queries=[
            "java village harvest festival community celebration",
            "traditional offering ceremony village indonesia landscape",
        ],
        narration=(
            "Di banyak daerah, Jaran Kepang juga terkait kesuburan dan tolak bala. "
            "Musik gamelan, pecut, dan jeritan—semua memanggil kekuatan. "
            "Hiburan rakyat menyatu dengan doa kolektif."
        ),
        cut_type="stat_card",
        cut_props={
            "stat": "Jaran Kepang",
            "subtitle": "Perang · roh · doa desa",
            "statFontSize": 52,
            "accentColor": GOLD,
            "backgroundOverlay": 0.74,
        },
    ),
    Scene(
        id="sebar",
        video_queries=[
            "indonesia cultural festival stage performance vertical cinematic",
            "traditional dance street parade indonesia vertical cinematic",
            "java night festival lights crowd vertical cinematic",
            "folk art performance outdoor stage vertical cinematic",
        ],
        image_queries=[
            "indonesia cultural festival traditional dance stage",
            "java folk performance outdoor festival night landscape",
        ],
        narration=(
            "Dari Jawa Tengah dan Timur, tarian ini menyebar ke mana-mana. "
            "Ada yang menyebut Kuda Lumping, ada yang Jathilan, ada Jaran Kepang. "
            "Satu akar, banyak wajah daerah."
        ),
        overlay={
            "type": "section_title",
            "text": "Menyebar",
            "subtitle": "Jawa · Jathilan · banyak nama",
            "accentColor": EARTH,
        },
    ),
    Scene(
        id="close",
        video_queries=[
            "sunset village java countryside peaceful vertical cinematic",
            "traditional indonesia culture heritage dusk vertical cinematic",
            "rural java landscape golden hour vertical cinematic",
            "community dance celebration dusk silhouette vertical cinematic",
        ],
        image_queries=[
            "java village countryside sunset golden hour landscape",
            "traditional indonesia cultural heritage dusk landscape",
        ],
        narration=(
            "Kuda Lumping mengingatkan: rakyat bisa menciptakan keajaiban "
            "dari bambu, irama, dan keberanian. "
            "Kuda anyaman itu tak punya kaki—tapi menari sampai kini."
        ),
        overlay={
            "type": "section_title",
            "text": "Warisan Rakyat",
            "subtitle": "Bambu · irama · keberanian",
            "accentColor": GOLD,
        },
    ),
]


def config() -> L3ProjectConfig:
    return L3ProjectConfig(
        slug=PROJECT_SLUG,
        title="KUDA LUMPING",
        subtitle="Asal-usul Tradisi Jaran Kepang",
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
            "soft traditional village courtyard calm atmosphere "
            "gentle distant percussion ambience warm earthy minimal"
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
