import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import icon from "../assets/app-icon-512.png";
import shot1 from "../assets/RAW 2/Screenshot_2026-07-30-12-51-51-000_com.android.chrome.jpg";
import shot2 from "../assets/RAW 2/Screenshot_2026-07-30-12-52-02-125_com.android.chrome.jpg";
import shot3 from "../assets/RAW 2/Screenshot_2026-07-30-12-52-08-021_com.android.chrome.jpg";
import shot4 from "../assets/RAW 2/Screenshot_2026-07-30-12-52-19-204_com.android.chrome.jpg";
import shot5 from "../assets/RAW 2/Screenshot_2026-07-30-12-52-25-261_com.android.chrome.jpg";
import shot6 from "../assets/RAW 2/Screenshot_2026-07-30-12-52-35-320_com.android.chrome.jpg";
import shot7 from "../assets/RAW 2/Screenshot_2026-07-30-12-53-08-416_com.android.chrome.jpg";
import shot8 from "../assets/RAW 2/Screenshot_2026-07-30-12-53-37-710_com.android.chrome.jpg";
import soundtrack from "../assets/promo/soundtrack.wav";

const colors = {
  ink: "#F8F5EC",
  muted: "#B9C7C0",
  green: "#B9F7D0",
  orange: "#FFD8A8",
  blue: "#C7D9FF",
  purple: "#F0C8FF",
};

const Background = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(128deg, #09120f 0%, #14261f 54%, #08100d 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 880,
          height: 880,
          borderRadius: "50%",
          right: -250 + Math.sin(frame / 55) * 45,
          top: -430 + Math.cos(frame / 70) * 30,
          background:
            "radial-gradient(circle, rgba(45,155,110,.58), rgba(45,155,110,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          left: -320 + Math.cos(frame / 65) * 40,
          bottom: -410 + Math.sin(frame / 80) * 35,
          background:
            "radial-gradient(circle, rgba(77,115,216,.36), rgba(77,115,216,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          transform: `translate(${(frame * 0.22) % 96}px, ${(frame * 0.1) % 96}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

const fadeForScene = (frame, duration) =>
  interpolate(frame, [0, 14, duration - 18, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Eyebrow = ({children, color = colors.green}) => (
  <div
    style={{
      display: "inline-flex",
      padding: "12px 20px",
      borderRadius: 999,
      color,
      background: `${color}18`,
      border: `1px solid ${color}55`,
      fontFamily: "Arial, sans-serif",
      fontSize: 19,
      fontWeight: 800,
      letterSpacing: 3,
    }}
  >
    {children}
  </div>
);

const Phone = ({src, x, y, scale = 1, rotate = 0, delay = 0, zIndex = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: {damping: 18, stiffness: 110, mass: 0.9},
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 390,
        height: 866,
        padding: 10,
        borderRadius: 52,
        background: "linear-gradient(145deg, #f4efe4, #a6b3ad)",
        boxShadow: "0 42px 90px rgba(0,0,0,.46), 0 0 0 1px rgba(255,255,255,.24)",
        transform: `translateY(${interpolate(enter, [0, 1], [170, 0])}px) scale(${scale * interpolate(enter, [0, 1], [0.9, 1])}) rotate(${rotate}deg)`,
        opacity: enter,
        zIndex,
      }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          left: 139,
          top: 18,
          width: 112,
          height: 18,
          borderRadius: 20,
          background: "rgba(9,16,13,.82)",
        }}
      />
      <Img
        src={src}
        style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: 42}}
      />
    </div>
  );
};

const Hook = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 16, stiffness: 95}});
  return (
    <AbsoluteFill
      style={{alignItems: "center", justifyContent: "center", opacity: fadeForScene(frame, 90)}}
    >
      <div style={{display: "flex", alignItems: "center", gap: 72}}>
        <div
          style={{
            width: 254,
            height: 254,
            borderRadius: 62,
            overflow: "hidden",
            boxShadow: "0 36px 90px rgba(0,0,0,.42)",
            transform: `scale(${interpolate(enter, [0, 1], [0.65, 1])}) rotate(${interpolate(enter, [0, 1], [-8, 0])}deg)`,
          }}
        >
          <Img src={icon} style={{width: "100%", height: "100%"}} />
        </div>
        <div style={{width: 1030}}>
          <Eyebrow>AI WORK STUDIO</Eyebrow>
          <h1
            style={{
              margin: "34px 0 20px",
              fontFamily: "Georgia, serif",
              fontSize: 112,
              lineHeight: 0.98,
              letterSpacing: -5,
              color: colors.ink,
              fontWeight: 500,
            }}
          >
            Bahan masuk.
            <br />
            Hasil siap.
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              color: colors.muted,
            }}
          >
            Foto, catatan, dan file diubah AI menjadi dokumen yang rapi.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeatureScene = ({
  title,
  description,
  label,
  color,
  primary,
  secondary,
  duration = 120,
  flip = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 20, stiffness: 85}});
  const textLeft = flip ? 1040 : 130;
  const phoneLeft = flip ? 140 : 1180;
  const secondLeft = flip ? 520 : 1460;
  return (
    <AbsoluteFill style={{opacity: fadeForScene(frame, duration)}}>
      <div
        style={{
          position: "absolute",
          left: textLeft,
          top: 214,
          width: 710,
          transform: `translateX(${interpolate(enter, [0, 1], [flip ? 80 : -80, 0])}px)`,
          opacity: enter,
        }}
      >
        <Eyebrow color={color}>{label}</Eyebrow>
        <h2
          style={{
            margin: "34px 0 24px",
            color: colors.ink,
            fontFamily: "Georgia, serif",
            fontSize: 86,
            lineHeight: 1.02,
            fontWeight: 500,
            letterSpacing: -3.2,
            whiteSpace: "pre-line",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            maxWidth: 650,
            color: colors.muted,
            fontFamily: "Arial, sans-serif",
            fontSize: 31,
            lineHeight: 1.42,
          }}
        >
          {description}
        </p>
        <div
          style={{
            marginTop: 46,
            width: interpolate(enter, [0, 1], [0, 150]),
            height: 7,
            borderRadius: 8,
            background: color,
          }}
        />
      </div>
      <Phone
        src={secondary}
        x={secondLeft}
        y={116}
        scale={0.88}
        rotate={flip ? 5 : -5}
        delay={10}
      />
      <Phone
        src={primary}
        x={phoneLeft}
        y={105}
        scale={1}
        rotate={flip ? -2 : 2}
        delay={2}
        zIndex={3}
      />
    </AbsoluteFill>
  );
};

const Montage = () => {
  const frame = useCurrentFrame();
  const shots = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8];
  return (
    <AbsoluteFill style={{alignItems: "center", opacity: fadeForScene(frame, 180)}}>
      <div style={{position: "absolute", top: 72, textAlign: "center"}}>
        <Eyebrow color={colors.orange}>SATU APLIKASI • BANYAK PEKERJAAN</Eyebrow>
        <div
          style={{
            marginTop: 22,
            fontFamily: "Georgia, serif",
            fontSize: 66,
            color: colors.ink,
          }}
        >
          Pilih template. Lampirkan bahan. Terima hasil.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 270,
          left: 42,
          display: "flex",
          gap: 18,
          transform: `translateX(${interpolate(frame, [0, 180], [0, -600])}px)`,
        }}
      >
        {shots.map((shot, index) => (
          <div
            key={shot}
            style={{
              width: 280,
              height: 622,
              flex: "0 0 auto",
              borderRadius: 30,
              padding: 7,
              background: index % 2 ? colors.orange : colors.green,
              boxShadow: "0 28px 60px rgba(0,0,0,.38)",
              transform: `translateY(${Math.sin((frame + index * 17) / 25) * 13}px)`,
            }}
          >
            <Img
              src={shot}
              style={{width: "100%", height: "100%", objectFit: "cover", borderRadius: 24}}
            />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 90}});
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity: fadeForScene(frame, 150),
      }}
    >
      <Img
        src={icon}
        style={{
          width: 180,
          height: 180,
          borderRadius: 44,
          boxShadow: "0 30px 70px rgba(0,0,0,.4)",
          transform: `scale(${interpolate(enter, [0, 1], [0.55, 1])})`,
        }}
      />
      <div
        style={{
          marginTop: 34,
          fontFamily: "Arial, sans-serif",
          fontWeight: 800,
          letterSpacing: 5,
          color: colors.green,
          fontSize: 22,
        }}
      >
        AI WORK STUDIO
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: "Georgia, serif",
          color: colors.ink,
          fontSize: 88,
          lineHeight: 1,
          letterSpacing: -3,
        }}
      >
        Kerjaan beres.
        <br />
        Waktu kembali.
      </div>
      <div
        style={{
          marginTop: 34,
          padding: "17px 30px",
          borderRadius: 999,
          background: colors.green,
          color: "#102019",
          fontFamily: "Arial, sans-serif",
          fontSize: 25,
          fontWeight: 800,
        }}
      >
        Temukan di Google Play
      </div>
    </AbsoluteFill>
  );
};

export const PromoVideo = () => (
  <AbsoluteFill>
    <Background />
    <Html5Audio src={soundtrack} volume={0.78} />
    <Sequence from={0} durationInFrames={90}>
      <Hook />
    </Sequence>
    <Sequence from={90} durationInFrames={120}>
      <FeatureScene
        label="MULAI DARI BAHAN YANG ADA"
        title={"Foto masuk.\nLaporan jadi."}
        description="Cukup tambahkan dokumentasi dan sedikit narasi. AI menyusun laporan yang lengkap dan siap dipakai."
        color={colors.orange}
        primary={shot2}
        secondary={shot1}
        duration={120}
      />
    </Sequence>
    <Sequence from={210} durationInFrames={120}>
      <FeatureScene
        label="BACA • RINGKAS • SUSUN"
        title={"Dokumen panjang,\nlangsung ringkas."}
        description="Tentukan fokusnya, lampirkan berkas, lalu dapatkan inti yang mudah dibaca."
        color={colors.blue}
        primary={shot3}
        secondary={shot4}
        duration={120}
        flip
      />
    </Sequence>
    <Sequence from={330} durationInFrames={120}>
      <FeatureScene
        label="HASIL SIAP KIRIM"
        title={"Rapi. Lengkap.\nSiap dibagikan."}
        description="Salin, simpan, bagikan PDF, atau unduh Word tanpa menyusun ulang."
        color={colors.green}
        primary={shot6}
        secondary={shot5}
        duration={120}
      />
    </Sequence>
    <Sequence from={450} durationInFrames={120}>
      <FeatureScene
        label="DOKUMEN + DATA"
        title={"Bukan cuma teks.\nData pun beres."}
        description="Rekap Excel, daftar hadir, ekstraksi tabel, dan panduan kerja ada dalam satu alur."
        color={colors.purple}
        primary={shot7}
        secondary={shot8}
        duration={120}
        flip
      />
    </Sequence>
    <Sequence from={570} durationInFrames={180}>
      <Montage />
    </Sequence>
    <Sequence from={750} durationInFrames={150}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
