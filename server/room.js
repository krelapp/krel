import { WebSocketServer } from "ws";

const MAX = 20;
const Z_MAX = 12.1;
const SPAWNS = [
  [3.4, 3.2],
  [4.6, 3.8],
  [6.5, 3.4],
  [4.0, 5.0],
  [7.6, 4.2]
];
const SOFA = {
  1: { x: 10.58, z: 3.88, yaw: Math.PI },
  2: { x: 11.42, z: 3.88, yaw: Math.PI }
};

const world = { power: true, lamp: true, radio: -1, door: false };

function worldMsg() {
  return { type: "world", power: world.power, lamp: world.lamp, radio: world.radio, door: world.door };
}

export function attachRoom(httpServer) {
  if (!httpServer || httpServer.__krelRoom) return;
  httpServer.__krelRoom = true;

  const wss = new WebSocketServer({ noServer: true });
  const people = new Map();
  const sofa = { 1: null, 2: null };
  let seq = 1;

  httpServer.on("upgrade", (req, socket, head) => {
    const path = (req.url || "").split("?")[0];
    if (path !== "/room") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const send = (ws, msg) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  };

  const snapshot = (except) => {
    const list = [];
    for (const [id, p] of people) {
      if (id !== except) list.push({ id, x: p.x, z: p.z, yaw: p.yaw, sit: p.sit });
    }
    return list;
  };

  const broadcast = (from, msg) => {
    const raw = JSON.stringify(msg);
    for (const p of people.values()) {
      if (p.ws !== from && p.ws.readyState === 1) p.ws.send(raw);
    }
  };

  const poseOf = (p) => ({ type: "pose", id: p.id, x: p.x, z: p.z, yaw: p.yaw, sit: p.sit });

  const leaveSeat = (id) => {
    if (sofa[1] === id) sofa[1] = null;
    if (sofa[2] === id) sofa[2] = null;
  };

  const takeSeat = (id, px) => {
    if (sofa[1] === id) return 1;
    if (sofa[2] === id) return 2;
    const free = [1, 2].filter((n) => !sofa[n]);
    if (!free.length) return 0;
    free.sort((a, b) => Math.abs(SOFA[a].x - px) - Math.abs(SOFA[b].x - px));
    const n = free[0];
    sofa[n] = id;
    return n;
  };

  const park = (p, n) => {
    const s = SOFA[n];
    p.sit = n;
    p.x = s.x;
    p.z = s.z;
    p.yaw = s.yaw;
  };

  const pickSpawn = () => {
    for (const spot of SPAWNS) {
      let free = true;
      for (const p of people.values()) {
        if (Math.hypot(p.x - spot[0], p.z - spot[1]) < 0.8) {
          free = false;
          break;
        }
      }
      if (free) return spot;
    }
    return SPAWNS[(seq - 1) % SPAWNS.length];
  };

  wss.on("connection", (ws) => {
    if (people.size >= MAX) {
      send(ws, { type: "full" });
      ws.close();
      return;
    }

    const id = String(seq++);
    const [x, z] = pickSpawn();
    const me = { ws, id, x, z, yaw: 0, sit: 0 };
    people.set(id, me);
    send(ws, { type: "hello", id, x, z, others: snapshot(id), world: { ...world } });
    broadcast(ws, { type: "join", id, x, z, yaw: 0, sit: 0 });

    ws.on("message", (buf) => {
      let msg;
      try { msg = JSON.parse(String(buf)); } catch { return; }

      if (msg.type === "world") {
        if ("power" in msg) world.power = !!msg.power;
        if ("lamp" in msg) world.lamp = !!msg.lamp;
        if ("radio" in msg) {
          const r = Number(msg.radio);
          if (Number.isFinite(r)) world.radio = Math.max(-1, Math.min(2, Math.round(r)));
        }
        if ("door" in msg) world.door = !!msg.door;
        broadcast(ws, worldMsg());
        return;
      }

      if (msg.type === "sit") {
        const n = takeSeat(id, me.x);
        if (!n) {
          send(ws, { type: "sofa_full" });
          return;
        }
        park(me, n);
        send(ws, { type: "seated", sit: n, x: me.x, z: me.z, yaw: me.yaw });
        broadcast(ws, poseOf(me));
        return;
      }

      if (msg.type === "stand") {
        if (!me.sit) return;
        leaveSeat(id);
        me.sit = 0;
        broadcast(ws, poseOf(me));
        return;
      }

      if (msg.type !== "pose") return;
      const nx = Number(msg.x), nz = Number(msg.z), yaw = Number(msg.yaw);
      if (!Number.isFinite(nx) || !Number.isFinite(nz) || !Number.isFinite(yaw)) return;
      const wantSit = msg.sit === 1 || msg.sit === 2 ? msg.sit : 0;
      if (me.sit && !wantSit) {
        leaveSeat(id);
        me.sit = 0;
      }
      if (me.sit) {
        park(me, me.sit);
      } else {
        me.x = Math.min(13, Math.max(0, nx));
        me.z = Math.min(Z_MAX, Math.max(0, nz));
        me.yaw = yaw;
        me.sit = 0;
      }
      broadcast(ws, poseOf(me));
    });

    ws.on("close", () => {
      if (!people.has(id)) return;
      leaveSeat(id);
      people.delete(id);
      broadcast(ws, { type: "leave", id });
    });
  });
}

export function krelRoom() {
  return {
    name: "krel-room",
    configureServer(server) {
      return () => attachRoom(server.httpServer);
    },
    configurePreviewServer(server) {
      return () => attachRoom(server.httpServer);
    }
  };
}
