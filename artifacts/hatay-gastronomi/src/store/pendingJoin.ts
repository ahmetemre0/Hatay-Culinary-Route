let _pending: { roomCode: string; playerName: string } | null = null;

export function setPendingJoin(p: { roomCode: string; playerName: string }) {
  _pending = p;
}

export function takePendingJoin(): { roomCode: string; playerName: string } | null {
  const p = _pending;
  _pending = null;
  return p;
}
