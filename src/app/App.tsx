import { useState, type FormEvent } from 'react';
import { EyelinerTutorial } from '../features/eyeliner/EyelinerTutorial';
import { Action, HomeIndicator } from '../features/eyeliner/lessonUi';

const INVITE_CODE = '241108';

export function App() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [entered, setEntered] = useState(false);

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code !== INVITE_CODE) {
      setError(code.length === 6 ? '초대 코드가 맞지 않아요.' : '숫자 6자리를 입력해 주세요.');
      return;
    }
    setEntered(true);
  }

  if (entered) return <EyelinerTutorial />;

  return (
    <div className="j-v2">
      <main className="invite-content">
        <h1>젬메 체험 코드</h1>
        <p>초대 코드 6자리를 입력해 주세요.</p>
        <form className="invite-form" onSubmit={enter}>
          <input
            aria-label="초대 코드"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'invite-error' : undefined}
            onChange={(event) => {
              setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6));
              setError('');
            }}
          />
          {error && (
            <p id="invite-error" role="alert">
              {error}
            </p>
          )}
          <Action type="submit">체험 시작</Action>
        </form>
      </main>
      <HomeIndicator />
    </div>
  );
}
