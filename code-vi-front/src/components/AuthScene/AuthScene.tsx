import { useState } from 'react';
import './AuthScene.css';
import loginVisualImage from '../../assets/auth/login_bg.png';

function AuthScene({ step, onClose, onGoSignup, onGoLogin }) {
  const isOpen = step !== 'closed';
  const isSignup = step === 'signup';
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div
      className={[
        'auth-scene',
        isOpen ? 'open' : '',
        isSignup ? 'signup' : 'login',
      ].join(' ')}
    >
      <div className="auth-scene-backdrop" onClick={onClose} />

      <div className="auth-scene-shell">
        <button
          type="button"
          className="auth-scene-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        <div className="auth-login-stage">
          <div className="auth-login-visual">
            <div className="auth-login-visual-card">
              <img src={loginVisualImage} alt="로그인 안내 비주얼" />
            </div>
          </div>

          <div className="auth-login-panel">
            <div className="auth-brand auth-brand--login">
              <span>RE:</span>
              <span>
                FACT<span className="accent">ORY</span>
              </span>
            </div>

            <div className="auth-login-form-wrap">
              <h2 className="auth-login-title">Login</h2>

              <form className="auth-login-form">
                <input type="text" placeholder="ID" autoComplete="username" />

                <div className="auth-password-wrap">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                    aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {isPasswordVisible ? (
                      <svg viewBox="0 0 24 24" className="auth-eye-icon" aria-hidden="true">
                        <path
                          d="M2 12S5.5 5 12 5s10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    ) : (
                      /* 눈 감은 상태: 비밀번호 숨김 */
                      <svg viewBox="0 0 24 24" className="auth-eye-icon" aria-hidden="true">
                        <path
                          d="M3 3L21 21"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.58 10.58A2 2 0 0013.42 13.42"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.88 5.09A10.94 10.94 0 0112 4.91c5.05 0 8.27 4.19 9 5.09-.32.39-1.11 1.33-2.32 2.3M6.23 6.23C3.9 7.83 2.46 9.71 2 10.29c.73.9 3.95 5.09 9 5.09 1.41 0 2.68-.26 3.81-.68"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <button type="button" className="auth-link-btn">
                  Recover Password ?
                </button>

                <button type="submit" className="auth-primary-btn">
                  Login
                </button>

                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={onGoSignup}
                >
                  Sign Up
                </button>
              </form>
            </div>

          </div>
        </div>

        <div className="auth-signup-stage">
          <div className="auth-brand auth-brand--signup">
            <span>RE:</span>
            <span>
              FACT<span className="accent">ORY</span>
            </span>
          </div>

          <div className="auth-signup-header">
            <h2>회원가입</h2>
            <p>코드를 해부하고 구조를 시각화하고 더 나은 형태로 다시 설계합니다</p>
          </div>

          <div className="auth-signup-card">
            <h3>기본 정보</h3>

            <form className="auth-signup-form">
              <div className="signup-field">
                <label>
                  이름 <span>(필수)</span>
                </label>
                <input type="text" placeholder="이름을 입력하세요" />
              </div>

              <div className="signup-row">
                <div className="signup-field flex-1">
                  <label>
                    아이디 <span>(필수)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="8~16자의 영문 대/소문자, 숫자, 특수문자"
                  />
                </div>
                <button type="button" className="signup-side-btn">
                  중복 확인
                </button>
              </div>

              <div className="signup-field">
                <label>
                  비밀번호 <span>(필수)</span>
                </label>
                <input type="password" placeholder="8~16자 비밀번호" />
              </div>

              <div className="signup-field">
                <label>
                  비밀번호 확인 <span>(필수)</span>
                </label>
                <input type="password" placeholder="비밀번호 확인" />
              </div>

              <div className="signup-row">
                <div className="signup-field flex-1">
                  <label>
                    휴대폰 번호 <span>(필수)</span>
                  </label>
                  <input type="text" placeholder="'-' 제외 숫자 입력" />
                </div>
                <button type="button" className="signup-side-btn">
                  인증번호 받기
                </button>
              </div>

              <div className="signup-row">
                <div className="signup-field flex-1">
                  <input type="text" placeholder="인증번호 4자리" />
                </div>
                <button type="button" className="signup-side-btn">
                  확인
                </button>
              </div>

              <div className="signup-field">
                <label>
                  이메일 <span>(필수)</span>
                </label>

                <div className="signup-email-layout">
                  <div className="signup-email-composite">
                    <input
                      type="text"
                      className="signup-email-id"
                      placeholder="이메일 아이디"
                    />

                    <span className="signup-email-sep signup-at">@</span>

                    <input
                      type="text"
                      className="signup-email-domain"
                      placeholder="이메일 호스트"
                    />

                    <select className="signup-email-select" defaultValue="직접입력">
                      <option>직접입력</option>
                      <option>naver.com</option>
                      <option>gmail.com</option>
                      <option>daum.net</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="signup-field">
                <label>
                  직군 선택 <span>(필수)</span>
                </label>
                <select className="signup-select" defaultValue="">
                  <option value="">옵션 선택</option>
                  <option value="developer">개발자</option>
                  <option value="designer">디자이너</option>
                  <option value="planner">기획자</option>
                  <option value="general">일반인</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              <div className="signup-actions">
                <button
                  type="button"
                  className="signup-back-btn"
                  onClick={onGoLogin}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="auth-primary-btn signup-submit-btn"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthScene;