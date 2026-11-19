import pptxgen from "pptxgenjs";
import { fileURLToPath } from "node:url";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pptx.author = "SecureBlue Chat";
pptx.subject = "Encrypted Bluetooth messaging between two Android phones";
pptx.title = "SecureBlue Chat";
pptx.company = "";

const C = {
  bg: "0B1020",
  card: "141C2F",
  cardHi: "18233A",
  line: "26324A",
  text: "EAF0FA",
  muted: "97A6C2",
  faint: "5F6E88",
  blue: "4C8DFF",
  blueDeep: "1D4ED8",
  cyan: "2DD4E8",
};

const W = 13.333;
const H = 7.5;
const FONT = "Segoe UI";
const MONO = "Consolas";

function base(slide) {
  slide.background = { color: C.bg };

  // soft blue glow, top right
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.4,
    y: -3.1,
    w: 7.2,
    h: 7.2,
    fill: { color: C.blue, transparency: 92 },
    line: { color: C.blue, transparency: 100 },
  });
  // faint cyan glow, bottom left
  slide.addShape(pptx.ShapeType.ellipse, {
    x: -2.6,
    y: 4.6,
    w: 5.4,
    h: 5.4,
    fill: { color: C.cyan, transparency: 95 },
    line: { color: C.cyan, transparency: 100 },
  });
}

function header(slide, kicker, title, sub) {
  slide.addText(kicker, {
    x: 0.85,
    y: 0.52,
    w: 9,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10.5,
    bold: true,
    color: C.cyan,
    charSpacing: 3,
  });
  slide.addText(title, {
    x: 0.82,
    y: 0.82,
    w: 11.7,
    h: 0.75,
    fontFace: FONT,
    fontSize: 30,
    bold: true,
    color: C.text,
    margin: 0,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.85,
      y: 1.56,
      w: 11.2,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13.5,
      color: C.muted,
      margin: 0,
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.85,
    y: 6.92,
    w: 11.65,
    h: 0,
    line: { color: C.line, width: 1 },
  });
}

function footer(slide, num, label = "SecureBlue Chat") {
  slide.addText(label, {
    x: 0.85,
    y: 6.98,
    w: 8,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9,
    color: C.faint,
    margin: 0,
  });
  slide.addText(String(num).padStart(2, "0"), {
    x: 11.6,
    y: 6.98,
    w: 0.9,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9,
    color: C.faint,
    align: "right",
    margin: 0,
  });
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: opts.radius ?? 0.1,
    fill: { color: opts.fill ?? C.card, transparency: opts.transparency ?? 0 },
    line: { color: opts.line ?? C.line, width: 1 },
  });
}

function badge(slide, x, y, d, label, fill, color = C.text) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: d,
    h: d,
    fill: { color: fill },
    line: { color: fill, width: 0 },
  });
  slide.addText(label, {
    x,
    y: y - 0.01,
    w: d,
    h: d,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color,
    align: "center",
    valign: "middle",
    margin: 0,
  });
}

/* ------------------------------------------------------------------ */
/* 1 — Title                                                           */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);

  s.addShape(pptx.ShapeType.rect, {
    x: 0.85,
    y: 1.42,
    w: 0.09,
    h: 1.95,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  });

  s.addText("ANDROID  ·  BLUETOOTH CLASSIC  ·  AES-256-GCM", {
    x: 1.2,
    y: 1.4,
    w: 6.2,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10.5,
    bold: true,
    color: C.cyan,
    charSpacing: 2.5,
    margin: 0,
  });

  s.addText("SecureBlue\nChat", {
    x: 1.12,
    y: 1.72,
    w: 5.9,
    h: 1.7,
    fontFace: FONT,
    fontSize: 46,
    bold: true,
    color: C.text,
    lineSpacingMultiple: 0.92,
    margin: 0,
  });

  s.addText(
    "Encrypted, serverless messaging between two Android phones.\nNo internet, no accounts, no cloud.",
    {
      x: 1.18,
      y: 3.5,
      w: 5.3,
      h: 0.9,
      fontFace: FONT,
      fontSize: 15,
      color: C.muted,
      lineSpacingMultiple: 1.35,
      margin: 0,
    }
  );

  s.addText("[Your Name]   ·   [Course / Guide]   ·   [Date]", {
    x: 1.18,
    y: 6.0,
    w: 6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 11.5,
    color: C.faint,
    margin: 0,
  });

  // --- channel graphic ---
  const phoneY = 2.05;
  const phoneW = 1.42;
  const phoneH = 2.95;

  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.55,
    y: phoneY,
    w: phoneW,
    h: phoneH,
    rectRadius: 0.22,
    rotate: -5,
    fill: { color: C.cardHi },
    line: { color: C.blue, width: 1.75 },
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.68,
    y: phoneY + 0.13,
    w: phoneW - 0.26,
    h: phoneH - 0.26,
    rectRadius: 0.16,
    rotate: -5,
    fill: { color: C.bg, transparency: 35 },
    line: { color: C.line, width: 1 },
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: 11.1,
    y: phoneY + 0.55,
    w: phoneW,
    h: phoneH,
    rectRadius: 0.22,
    rotate: 5,
    fill: { color: C.cardHi },
    line: { color: C.cyan, width: 1.75 },
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 11.23,
    y: phoneY + 0.68,
    w: phoneW - 0.26,
    h: phoneH - 0.26,
    rectRadius: 0.16,
    rotate: 5,
    fill: { color: C.bg, transparency: 35 },
    line: { color: C.line, width: 1 },
  });

  s.addText("A", {
    x: 7.55,
    y: phoneY + 1.2,
    w: phoneW,
    h: 0.5,
    fontFace: FONT,
    fontSize: 20,
    bold: true,
    color: C.blue,
    align: "center",
    margin: 0,
  });
  s.addText("B", {
    x: 11.1,
    y: phoneY + 1.75,
    w: phoneW,
    h: 0.5,
    fontFace: FONT,
    fontSize: 20,
    bold: true,
    color: C.cyan,
    align: "center",
    margin: 0,
  });

  // sealed channel
  s.addShape(pptx.ShapeType.line, {
    x: 9.05,
    y: 3.42,
    w: 1.95,
    h: 0,
    line: {
      color: C.blue,
      width: 1.75,
      dashType: "dash",
      beginArrowType: "triangle",
      endArrowType: "triangle",
    },
  });

  // lock badge on the channel
  s.addShape(pptx.ShapeType.roundRect, {
    x: 9.72,
    y: 3.02,
    w: 0.6,
    h: 0.5,
    rectRadius: 0.14,
    fill: { color: C.blueDeep },
    line: { color: C.blue, width: 1.25 },
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9.9,
    y: 2.86,
    w: 0.24,
    h: 0.3,
    fill: { color: C.bg, transparency: 100 },
    line: { color: C.blue, width: 1.75 },
  });

  s.addText("no server in the middle", {
    x: 8.55,
    y: 3.68,
    w: 3.2,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: C.faint,
    align: "center",
    margin: 0,
  });

  s.addNotes(
    "Two Android phones talk directly over Bluetooth with no server, no account and no internet. " +
      "Everything on the air is AES-256-GCM ciphertext. I'll show the app running on two real phones."
  );
}

/* ------------------------------------------------------------------ */
/* 2 — Problem + goal                                                  */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "WHY", "Messaging always leaves a trail", "Every mainstream chat app assumes a server, an account and a network.");

  const items = [
    ["01", "It needs someone else's computer", "Messages, contacts and metadata are stored and routed by a provider, not by you."],
    ["02", "Offline means no chat at all", "Classrooms, basements, flights, disaster sites - no tower, no messaging."],
    ["03", "Bluetooth demos send plain text", "Most sample apps push readable strings over RFCOMM that any nearby device can capture."],
  ];

  items.forEach(([n, title, body], i) => {
    const y = 2.35 + i * 1.45;
    card(s, 0.85, y, 7.1, 1.3, { fill: C.card });
    badge(s, 1.08, y + 0.4, 0.44, n, "1B2942", C.blue);
    s.addText(title, {
      x: 1.72,
      y: y + 0.22,
      w: 6.0,
      h: 0.32,
      fontFace: FONT,
      fontSize: 13.5,
      bold: true,
      color: C.text,
      valign: "top",
      margin: 0,
    });
    s.addText(body, {
      x: 1.72,
      y: y + 0.58,
      w: 6.0,
      h: 0.62,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.2,
      valign: "top",
      margin: 0,
    });
  });

  card(s, 8.3, 2.35, 4.2, 3.95, { fill: "12203C", line: C.blue, radius: 0.12 });
  s.addText("THE GOAL", {
    x: 8.63,
    y: 2.6,
    w: 3.6,
    h: 0.28,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 2.5,
    margin: 0,
  });
  s.addText(
    "A chat that works phone to phone, over the air, where the message body is encrypted end to end and nothing is stored in the cloud.",
    {
      x: 8.63,
      y: 2.98,
      w: 3.55,
      h: 2.0,
      fontFace: FONT,
      fontSize: 15,
      color: C.text,
      lineSpacingMultiple: 1.35,
      margin: 0,
    }
  );
  s.addShape(pptx.ShapeType.line, {
    x: 8.63,
    y: 5.15,
    w: 3.4,
    h: 0,
    line: { color: C.line, width: 1 },
  });
  s.addText("Direct link  ·  No account  ·  No cloud copy", {
    x: 8.63,
    y: 5.3,
    w: 3.5,
    h: 0.6,
    fontFace: FONT,
    fontSize: 10.5,
    color: C.muted,
    lineSpacingMultiple: 1.3,
    margin: 0,
  });

  footer(s, 2);
  s.addNotes(
    "Frame the problem: convenience messengers centralise everything. " +
      "Then contrast with the common Bluetooth chat tutorial, which sends plain text over a socket anyone nearby can sniff."
  );
}

/* ------------------------------------------------------------------ */
/* 3 — What it does                                                    */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "FEATURES", "Two phones, one encrypted channel", "Everything below runs on-device, with Bluetooth as the only transport.");

  const tiles = [
    ["01", "Discover & connect", "Classic Bluetooth discovery. Tap a nearby phone to open a chat with it."],
    ["02", "Shared-PIN handshake", "Both sides type the same PIN. A challenge-response proves the keys match."],
    ["03", "AES-256-GCM", "Every line is sealed with a fresh 12-byte IV and a 128-bit auth tag."],
    ["04", "Typing indicator", "An extra encrypted beacon type, throttled so it never floods the socket."],
    ["05", "Timestamps & quick actions", "Time on every bubble. Long-press to copy or delete a single message."],
    ["06", "Encrypted history", "Conversations persist on the phone, sealed by an Android Keystore key."],
  ];

  const tw = 3.72;
  const th = 1.62;
  tiles.forEach(([n, title, body], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.85 + col * (tw + 0.285);
    const y = 2.25 + row * (th + 0.3);
    card(s, x, y, tw, th, { fill: C.card, radius: 0.09 });
    badge(s, x + 0.24, y + 0.26, 0.4, n, "1B2942", C.blue);
    s.addText(title, {
      x: x + 0.78,
      y: y + 0.24,
      w: tw - 1.0,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12.5,
      bold: true,
      color: C.text,
      margin: 0,
    });
    s.addText(body, {
      x: x + 0.24,
      y: y + 0.72,
      w: tw - 0.48,
      h: 0.75,
      fontFace: FONT,
      fontSize: 11,
      color: C.muted,
      lineSpacingMultiple: 1.22,
      margin: 0,
    });
  });

  footer(s, 3);
  s.addNotes(
    "Walk the six tiles quickly, then spend time on the last two - timestamps/actions and encrypted history are the new work in this iteration."
  );
}

/* ------------------------------------------------------------------ */
/* 4 — Architecture                                                    */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "ARCHITECTURE", "One socket, one session key", "Bluetooth Classic RFCOMM carries the session; AES-GCM protects the payload.");

  card(s, 0.85, 2.25, 3.5, 2.75, { fill: C.card });
  s.addText("PHONE A  ·  HOST", {
    x: 1.1,
    y: 2.45,
    w: 3.0,
    h: 0.28,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: C.blue,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText([
    { text: "listenUsingRfcomm", options: { breakLine: true } },
    { text: "accepts one connection", options: { breakLine: true } },
    { text: "generates the 16-byte salt", options: { breakLine: true } },
    { text: "sends it in the clear", options: { breakLine: true } },
  ], {
    x: 1.1,
    y: 2.85,
    w: 3.0,
    h: 1.7,
    fontFace: MONO,
    fontSize: 10.5,
    color: C.muted,
    lineSpacingMultiple: 1.45,
    margin: 0,
  });

  card(s, 8.95, 2.25, 3.5, 2.75, { fill: C.card });
  s.addText("PHONE B  ·  CLIENT", {
    x: 9.2,
    y: 2.45,
    w: 3.0,
    h: 0.28,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText([
    { text: "createRfcommSocket", options: { breakLine: true } },
    { text: "connects to the SPP UUID", options: { breakLine: true } },
    { text: "reads the salt", options: { breakLine: true } },
    { text: "derives the same key", options: { breakLine: true } },
  ], {
    x: 9.2,
    y: 2.85,
    w: 3.15,
    h: 1.7,
    fontFace: MONO,
    fontSize: 10.5,
    color: C.muted,
    lineSpacingMultiple: 1.45,
    margin: 0,
  });

  s.addShape(pptx.ShapeType.line, {
    x: 4.5,
    y: 3.12,
    w: 4.3,
    h: 0,
    line: { color: C.blue, width: 1.5, endArrowType: "triangle" },
  });
  s.addShape(pptx.ShapeType.line, {
    x: 4.5,
    y: 4.18,
    w: 4.3,
    h: 0,
    line: { color: C.cyan, width: 1.5, beginArrowType: "triangle" },
  });
  s.addText("sealed lines (chat · typing)", {
    x: 4.55,
    y: 2.76,
    w: 4.2,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9.5,
    color: C.faint,
    align: "center",
    margin: 0,
  });
  s.addText("ACK / reply", {
    x: 4.55,
    y: 4.24,
    w: 4.2,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9.5,
    color: C.faint,
    align: "center",
    margin: 0,
  });
  s.addText("RFCOMM", {
    x: 4.55,
    y: 3.5,
    w: 4.2,
    h: 0.32,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: C.text,
    align: "center",
    margin: 0,
  });

  card(s, 0.85, 5.32, 11.62, 1.05, { fill: "12203C", line: C.blue, radius: 0.1 });
  s.addText("ON THE WIRE", {
    x: 1.12,
    y: 5.47,
    w: 2.4,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText("Base64( IV ‖ AES-256-GCM( type ‖ body ) ‖ tag )", {
    x: 1.12,
    y: 5.76,
    w: 6.6,
    h: 0.35,
    fontFace: MONO,
    fontSize: 13,
    color: C.text,
    margin: 0,
  });
  s.addText("one line per message, newline terminated", {
    x: 7.9,
    y: 5.78,
    w: 4.4,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9.5,
    color: C.faint,
    align: "right",
    margin: 0,
  });

  s.addText(
    "SPP UUID 00001101-0000-1000-8000-00805F9B34FB   ·   one peer per session   ·   service layer keeps UI state in Kotlin StateFlow",
    {
      x: 0.85,
      y: 6.45,
      w: 11.6,
      h: 0.3,
      fontFace: FONT,
      fontSize: 9.5,
      color: C.faint,
      margin: 0,
    }
  );

  footer(s, 4);
  s.addNotes(
    "Explain the split: Bluetooth is only the pipe. The interesting part is that every line on that pipe is a sealed envelope, " +
      "and a tiny type byte inside the envelope separates a chat message from a typing beacon."
  );
}

/* ------------------------------------------------------------------ */
/* 5 — Security                                                        */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "CRYPTO", "From a shared PIN to an authenticated channel", "The PIN never crosses the air. Only a random salt does.");

  const steps = [
    ["1", "Socket up", "RFCOMM link is established between the two phones."],
    ["2", "Salt", "Host sends 16 random bytes in the clear."],
    ["3", "PIN", "Both users type the same 4-8 digit PIN."],
    ["4", "Derive", "PBKDF2-HMAC-SHA256, 120k iterations, 256-bit key."],
    ["5", "Prove", "Encrypted challenge echoed back, then chat opens."],
  ];

  const sw = 2.08;
  const gap = 0.32;
  steps.forEach(([n, title, body], i) => {
    const x = 0.85 + i * (sw + gap);
    card(s, x, 2.3, sw, 1.98, { fill: C.card, radius: 0.09 });
    badge(s, x + 0.2, 2.49, 0.38, n, "1B2942", C.blue);
    s.addText(title, {
      x: x + 0.66,
      y: 2.52,
      w: sw - 0.8,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: C.text,
      margin: 0,
    });
    s.addText(body, {
      x: x + 0.2,
      y: 3.0,
      w: sw - 0.4,
      h: 1.0,
      fontFace: FONT,
      fontSize: 10,
      color: C.muted,
      lineSpacingMultiple: 1.25,
      margin: 0,
    });
    if (i < steps.length - 1) {
      s.addShape(pptx.ShapeType.line, {
        x: x + sw + 0.05,
        y: 3.3,
        w: 0.22,
        h: 0,
        line: { color: C.faint, width: 1.5, endArrowType: "triangle" },
      });
    }
  });

  card(s, 0.85, 4.62, 5.72, 1.95, { fill: C.card });
  s.addText("WHY A PIN IS ENOUGH HERE", {
    x: 1.1,
    y: 4.8,
    w: 5.2,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9.5,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText(
    "The PIN is never transmitted, so a passive listener cannot capture it. " +
      "It only has to be agreed once, face to face, and the session key is thrown away with the socket.",
    {
      x: 1.1,
      y: 5.12,
      w: 5.2,
      h: 1.3,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.32,
      margin: 0,
    }
  );

  card(s, 6.78, 4.62, 5.69, 1.95, { fill: C.card });
  s.addText("WHAT AN ATTACKER SEES", {
    x: 7.03,
    y: 4.8,
    w: 5.2,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9.5,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText(
    "Base64 noise. No plaintext and no PIN. If a wrong PIN is entered, the GCM authentication tag fails and the handshake is refused.",
    {
      x: 7.03,
      y: 5.12,
      w: 5.2,
      h: 1.3,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.32,
      margin: 0,
    }
  );

  footer(s, 5);
  s.addNotes(
    "Key point for a crypto audience: PBKDF2 stretches a weak human PIN, GCM gives confidentiality plus integrity, " +
      "and the challenge-response stops a wrong PIN from ever reaching the message loop."
  );
}

/* ------------------------------------------------------------------ */
/* 6 — What I added                                                    */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "THIS ITERATION", "From a working prototype to a usable messenger", "Three additions on top of the original send-and-receive core.");

  const cols = [
    ["CHAT UX", "Timestamps on every bubble, long-press to copy or delete a message, a live typing indicator, and clear-chat behind a confirmation.", C.blue, "Long-press any bubble to copy or delete it."],
    ["DURABLE HISTORY", "Conversations survive app restarts. A 'Saved conversation' card on the home screen reopens the thread; newest 500 messages are kept per peer.", C.cyan, "Cold start, same thread, still readable."],
    ["ENCRYPTED AT REST", "History is sealed with AES-256-GCM under a non-exportable Android Keystore key. The session key stays ephemeral and is never written to disk.", "8FB3FF", "Copy the file off the phone: ciphertext."],
  ];

  cols.forEach(([title, body, accent, proof], i) => {
    const x = 0.85 + i * 3.98;
    card(s, x, 2.28, 3.72, 3.6, { fill: C.card });
    s.addShape(pptx.ShapeType.rect, {
      x: x + 0.28,
      y: 2.55,
      w: 0.5,
      h: 0.05,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
    s.addText(title, {
      x: x + 0.28,
      y: 2.72,
      w: 3.1,
      h: 0.3,
      fontFace: FONT,
      fontSize: 10.5,
      bold: true,
      color: accent,
      charSpacing: 1.5,
      margin: 0,
    });
    s.addText(body, {
      x: x + 0.28,
      y: 3.14,
      w: 3.15,
      h: 1.55,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.32,
      valign: "top",
      margin: 0,
    });
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.28,
      y: 4.9,
      w: 3.15,
      h: 0,
      line: { color: C.line, width: 1 },
    });
    s.addText(proof, {
      x: x + 0.28,
      y: 5.04,
      w: 3.15,
      h: 0.6,
      fontFace: FONT,
      fontSize: 10,
      bold: true,
      color: C.text,
      lineSpacingMultiple: 1.25,
      valign: "top",
      margin: 0,
    });
  });

  card(s, 0.85, 6.06, 11.62, 0.62, { fill: "12203C", line: C.line, radius: 0.09 });
  s.addText(
    "Under the hood: the sealed envelope now carries a message type, so chat and typing share one authenticated format.",
    {
      x: 1.1,
      y: 6.18,
      w: 11.1,
      h: 0.35,
      fontFace: FONT,
      fontSize: 10.5,
      color: C.muted,
      margin: 0,
    }
  );

  footer(s, 6);
  s.addNotes(
    "This is the part that is new. The original app could send a message and nothing else. " +
      "Now there is a type byte inside the encrypted envelope, timestamps and actions in the UI, and a Keystore-keyed history store."
  );
}

/* ------------------------------------------------------------------ */
/* 7 — Demo                                                            */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "DEMO", "Two phones, in this room", "No internet, no router, no account - just Bluetooth.");

  const steps = [
    ["1", "Pair up", "Phone A: tap Wait. Phone B: Scan, then pick A."],
    ["2", "Unlock", "Both enter PIN 2468. The lock icon turns solid."],
    ["3", "Chat", "Watch timestamps land and the typing indicator pulse."],
    ["4", "Restart", "Close the app, reopen, open the saved conversation."],
  ];

  steps.forEach(([n, title, body], i) => {
    const y = 2.22 + i * 1.05;
    badge(s, 0.9, y + 0.04, 0.44, n, "1B2942", C.blue);
    s.addText(title, {
      x: 1.52,
      y: y,
      w: 2.0,
      h: 0.3,
      fontFace: FONT,
      fontSize: 13,
      bold: true,
      color: C.text,
      margin: 0,
    });
    s.addText(body, {
      x: 1.52,
      y: y + 0.3,
      w: 5.9,
      h: 0.5,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      valign: "top",
      margin: 0,
    });
  });

  s.addText("Demo trick: enter different PINs first - the handshake refuses to open.", {
    x: 0.9,
    y: 6.42,
    w: 6.6,
    h: 0.4,
    fontFace: FONT,
    fontSize: 10.5,
    italic: true,
    color: C.faint,
    margin: 0,
  });

  // --- phone mockup ---
  const px = 8.75;
  const py = 1.32;
  const pw = 3.05;
  const ph = 5.35;

  s.addShape(pptx.ShapeType.roundRect, {
    x: px,
    y: py,
    w: pw,
    h: ph,
    rectRadius: 0.3,
    fill: { color: "0E1526" },
    line: { color: "2E3B57", width: 2 },
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: px + 0.13,
    y: py + 0.13,
    w: pw - 0.26,
    h: ph - 0.26,
    rectRadius: 0.22,
    fill: { color: "101A2D" },
    line: { color: "1E2A42", width: 1 },
  });

  s.addText("Saved conversation", {
    x: px + 0.32,
    y: py + 0.3,
    w: 2.2,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: C.text,
    margin: 0,
  });
  s.addText("encrypted · AES-256-GCM", {
    x: px + 0.32,
    y: py + 0.55,
    w: 2.2,
    h: 0.22,
    fontFace: FONT,
    fontSize: 7,
    color: C.faint,
    margin: 0,
  });

  const bubble = (x, y, w, h, text, mine, time) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.16,
      fill: { color: mine ? "1D4ED8" : "1B2740" },
      line: { color: mine ? "1D4ED8" : "26324A", width: 1 },
    });
    s.addText(text, {
      x: x + 0.14,
      y: y + 0.1,
      w: w - 0.4,
      h: h - 0.2,
      fontFace: FONT,
      fontSize: 8.5,
      color: mine ? "EAF0FA" : "C9D5E8",
      valign: "middle",
      margin: 0,
    });
    if (time) {
      s.addText(time, {
        x: x + w - 0.42,
        y: y + h - 0.02,
        w: 0.4,
        h: 0.18,
        fontFace: FONT,
        fontSize: 6,
        color: mine ? "C7DBFF" : "6D7C99",
        align: "right",
        margin: 0,
      });
    }
  };

  const left = px + 0.3;
  bubble(left, py + 0.95, 1.55, 0.5, "Are you near the lab?", false, "10:41");
  bubble(left + 0.62, py + 1.6, 1.68, 0.5, "Two floors up, no signal", true, "10:41");
  bubble(left, py + 2.25, 1.85, 0.5, "This works over Bluetooth?", false, "10:42");
  bubble(left + 0.5, py + 2.9, 1.8, 0.62, "Encrypted. Try typing.", true, null);
  s.addText("10:42  ✓", {
    x: left + 1.86,
    y: py + 3.55,
    w: 0.72,
    h: 0.2,
    fontFace: FONT,
    fontSize: 6,
    color: "6D7C99",
    align: "right",
    margin: 0,
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: left,
    y: py + 3.85,
    w: 1.15,
    h: 0.34,
    rectRadius: 0.16,
    fill: { color: "1B2740" },
    line: { color: "26324A", width: 1 },
  });
  s.addText("typing...", {
    x: left + 0.12,
    y: py + 3.9,
    w: 0.95,
    h: 0.22,
    fontFace: FONT,
    fontSize: 7.5,
    italic: true,
    color: C.cyan,
    margin: 0,
  });

  s.addShape(pptx.ShapeType.roundRect, {
    x: px + 0.28,
    y: py + 4.55,
    w: pw - 0.56,
    h: 0.4,
    rectRadius: 0.2,
    fill: { color: "16223A" },
    line: { color: "26324A", width: 1 },
  });
  s.addText("Message", {
    x: px + 0.44,
    y: py + 4.62,
    w: 1.4,
    h: 0.25,
    fontFace: FONT,
    fontSize: 7.5,
    color: C.faint,
    margin: 0,
  });
  s.addShape(pptx.ShapeType.ellipse, {
    x: px + pw - 0.78,
    y: py + 4.55,
    w: 0.4,
    h: 0.4,
    fill: { color: C.blue },
    line: { color: C.blue, width: 0 },
  });
  s.addText("→", {
    x: px + pw - 0.78,
    y: py + 4.6,
    w: 0.4,
    h: 0.25,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: "FFFFFF",
    align: "center",
    margin: 0,
  });

  footer(s, 7);
  s.addNotes(
    "Run the demo in this order. The restart step is the one that shows the new persistence work. " +
      "If time allows, enter mismatched PINs to show the handshake refusing to open."
  );
}

/* ------------------------------------------------------------------ */
/* 8 — Limits + next                                                   */
/* ------------------------------------------------------------------ */
{
  const s = pptx.addSlide();
  base(s);
  header(s, "HONESTY & NEXT", "What it does not do yet", "Useful to say out loud before someone else asks.");

  card(s, 0.85, 2.28, 5.72, 2.95, { fill: C.card });
  s.addText("KNOWN LIMITS", {
    x: 1.1,
    y: 2.48,
    w: 4.9,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText(
    [
      { text: "No forward secrecy - one key per session, derived from a human PIN.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "The PIN must be shared out of band; no QR or safety-number check yet.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "One peer at a time. No group chat, no offline message queue.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "The session ends when the app leaves the foreground.", options: { bullet: { indent: 14 }, breakLine: true } },
    ],
    {
      x: 1.1,
      y: 2.82,
      w: 5.15,
      h: 2.2,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.35,
      paraSpaceAfter: 10,
      valign: "top",
      margin: 0,
    }
  );

  card(s, 6.78, 2.28, 5.69, 2.95, { fill: C.card });
  s.addText("WHAT'S NEXT", {
    x: 7.03,
    y: 2.48,
    w: 4.9,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: C.cyan,
    charSpacing: 1.5,
    margin: 0,
  });
  s.addText(
    [
      { text: "X25519 key exchange plus QR pairing, PIN as a fallback.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "Foreground service so a session survives screen-off.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "File and photo transfer over the same sealed channel.", options: { bullet: { indent: 14 }, breakLine: true } },
      { text: "Relay through other phones - a small Bluetooth mesh.", options: { bullet: { indent: 14 }, breakLine: true } },
    ],
    {
      x: 7.03,
      y: 2.82,
      w: 5.15,
      h: 2.2,
      fontFace: FONT,
      fontSize: 11.5,
      color: C.muted,
      lineSpacingMultiple: 1.35,
      paraSpaceAfter: 10,
      valign: "top",
      margin: 0,
    }
  );

  s.addText("Thank you - questions?", {
    x: 0.85,
    y: 5.68,
    w: 8,
    h: 0.5,
    fontFace: FONT,
    fontSize: 22,
    bold: true,
    color: C.text,
    margin: 0,
  });
  s.addText("Live demo runs on request - two phones, airplane mode on, Bluetooth on.", {
    x: 0.85,
    y: 6.2,
    w: 9,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: C.faint,
    margin: 0,
  });

  footer(s, 8);
  s.addNotes(
    "Being upfront about the limits buys credibility. If asked about forward secrecy: the PIN-derived key is per session, " +
      "but there is no ratchet yet - that would need an X25519 exchange."
  );
}

const out = fileURLToPath(new URL("./SecureBlueChat.pptx", import.meta.url));
await pptx.writeFile({ fileName: out });
console.log("wrote " + out);
