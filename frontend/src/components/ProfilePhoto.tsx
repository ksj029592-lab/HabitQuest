import { ChangeEvent, useEffect, useState } from 'react';
import { PersonaGameState } from '@types';
import { userApi } from '../api/user';
import { AvatarFrame } from './AvatarFrame';
import { Button } from './Button';

async function encodePhoto(file: File) {
  if (!file.type.startsWith('image/') || file.size > 8_000_000) throw new Error('8 MB 이하의 이미지 파일을 선택해 주세요.');
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 사진을 처리하지 못했어요.');
    const side = Math.min(image.width, image.height);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
    const jpeg = canvas.toDataURL('image/jpeg', .78).split(',')[1];
    if (!jpeg || jpeg.length > 80_000) throw new Error('사진을 줄이지 못했어요. 다른 이미지를 선택해 주세요.');
    return jpeg;
  } finally { image.close(); }
}

export function ProfilePhoto({ persona, onSaved }: { persona: PersonaGameState; onSaved: (replaced: boolean) => void }) {
  const [jpeg, setJpeg] = useState<string | null>(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    void userApi.getPhoto(persona.userId).then((result) => {
      if (!result.success || !result.data) throw new Error();
      if (active) { setJpeg(result.data.jpeg); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [persona.userId, attempt]);

  const save = async (file?: File) => {
    if (busy || status === 'loading') return;
    setBusy(true);
    setMessage('');
    try {
      const result = file ? await userApi.savePhoto(persona.userId, await encodePhoto(file)) : await userApi.removePhoto(persona.userId);
      if (!result.success || !result.data) throw new Error('프로필 사진을 저장하지 못했어요.');
      setJpeg(result.data.jpeg);
      onSaved(Boolean(file));
      setMessage(file ? '현재 페르소나에 사진을 저장했어요.' : '프로필 사진을 삭제했어요.');
    } catch (error) {
      setMessage(error instanceof Error && !('response' in error) ? error.message : '사진 변경을 확인하지 못했어요. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void save(file);
  };
  const avatarUrl = persona.specialAvatarId ? null : jpeg ? `data:image/jpeg;base64,${jpeg}` : persona.avatarUrl;
  return <div className="hq-photo-panel">
    <AvatarFrame avatarIndex={persona.avatarIndex} avatarUrl={avatarUrl} specialAvatarId={persona.specialAvatarId}
      equippedBorder={persona.equippedBorder} equippedDecoration={persona.equippedDecoration} size="xl" />
    <label htmlFor="profile-photo">페르소나 프로필 사진</label>
    <input id="profile-photo" type="file" accept="image/*" disabled={busy || status === 'loading'} onChange={choose} />
    {jpeg && <Button size="small" variant="secondary" disabled={busy} onClick={() => void save()}>저장한 사진 삭제</Button>}
    {!jpeg && persona.avatarUrl && <p className="hq-activity-caption">이전에 올린 사진은 이 브라우저에만 있어요. 다시 올리면 현재 페르소나에 저장됩니다.</p>}
    {status === 'error' && <Button size="small" variant="secondary" onClick={() => setAttempt((value) => value + 1)}>사진 다시 불러오기</Button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
