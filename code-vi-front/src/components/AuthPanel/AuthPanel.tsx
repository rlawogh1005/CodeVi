import { useState } from 'react';
import './AuthPanel.css';
import loginBg from '../../assets/auth/login_bg.png';
import signupBg from '../../assets/auth/signup_bg.png';

function AuthPanel({ step, onClose, onGoSignup, onGoLogin }) {
  const isOpen = step !== 'closed';
  const isSignup = step === 'signup';

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    userId: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    verifyCode: '',
    emailLocal: '',
    emailHost: '',
    job: '',
  });

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    console.log('Login submit:', loginForm);
  };

  const handleSignupSubmit = (event) => {
    event.preventDefault();
    console.log('Signup submit:', signupForm);
  };

  return (
    <div
      className={['auth-modal', isOpen ? 'open' : '', isSignup ? 'right-panel-active' : ''].join(
        ' ',
      )}
      aria-hidden={!isOpen}
    >
      <div className="auth-modal-backdrop" onClick={onClose} />

      <section className="auth-modal-shell" role="dialog" aria-modal="true" aria-label="Auth">
        <button type="button" className="auth-modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div
          className="auth-container"
          style={{
            ['--auth-bg-image']: `url(${isSignup ? signupBg : loginBg})`,
            ['--auth-bg-position']: isSignup ? 'center' : 'right center',
            ['--auth-bg-size']: isSignup ? 'cover' : '200% 100%',
            ['--auth-overlay-alpha']: isSignup ? '0.58' : '0.46',
            ['--auth-overlay-blur']: isSignup ? '1px' : '0px',
          }}
        >
          <div className="auth-forms-track">
            <div className="auth-form-panel auth-login-panel">
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <h2 className="auth-form-title">Login</h2>
                <p className="auth-form-subtitle">Use your existing account.</p>

                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  required
                />

                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                  required
                />

                <button type="submit" className="auth-submit-btn">
                  Login
                </button>

                <button type="button" className="auth-secondary-btn" onClick={onGoSignup}>
                  Sign Up
                </button>
              </form>
            </div>

            <div className="auth-form-panel auth-signup-panel">
              <div className="auth-signup-scroll">
                <div className="auth-brand auth-brand--signup">
                  <span>RE:</span>
                  <span>
                    FACT<span className="accent">ORY</span>
                  </span>
                </div>

                <div className="auth-signup-stack">
                  <div className="auth-signup-header">
                    <h2>회원가입</h2>
                    <p>코드를 해부하고 구조를 시각화하고 더 나은 형태로 다시 설계합니다</p>
                  </div>

                  <div className="auth-signup-card">
                    <h3>기본 정보</h3>

                    <form className="auth-signup-form" onSubmit={handleSignupSubmit}>
                    <div className="signup-field">
                      <label htmlFor="su-name">
                        이름 <span>(필수)</span>
                      </label>
                      <input
                        id="su-name"
                        name="name"
                        type="text"
                        placeholder="이름을 입력하세요"
                        value={signupForm.name}
                        onChange={handleSignupChange}
                        autoComplete="name"
                      />
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-userid">
                          아이디 <span>(필수)</span>
                        </label>
                        <input
                          id="su-userid"
                          name="userId"
                          type="text"
                          placeholder="8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해주세요"
                          value={signupForm.userId}
                          onChange={handleSignupChange}
                          autoComplete="username"
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        중복 확인
                      </button>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-password">
                        비밀번호 <span>(필수)</span>
                      </label>
                      <input
                        id="su-password"
                        name="password"
                        type="password"
                        placeholder="8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해주세요"
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-password2">
                        비밀번호 확인 <span>(필수)</span>
                      </label>
                      <input
                        id="su-password2"
                        name="passwordConfirm"
                        type="password"
                        placeholder="동일한 비밀번호를 입력하세요"
                        value={signupForm.passwordConfirm}
                        onChange={handleSignupChange}
                        autoComplete="new-password"
                      />
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-phone">
                          휴대폰 번호 <span>(필수)</span>
                        </label>
                        <input
                          id="su-phone"
                          name="phone"
                          type="text"
                          placeholder="'-' 제외하고 숫자만 입력하세요"
                          value={signupForm.phone}
                          onChange={handleSignupChange}
                          autoComplete="tel"
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        인증번호 받기
                      </button>
                    </div>

                    <div className="signup-row">
                      <div className="signup-field flex-1">
                        <label htmlFor="su-code" className="sr-only">
                          인증번호
                        </label>
                        <input
                          id="su-code"
                          name="verifyCode"
                          type="text"
                          placeholder="인증번호 숫자 4자리를 입력하세요"
                          value={signupForm.verifyCode}
                          onChange={handleSignupChange}
                        />
                      </div>
                      <button type="button" className="signup-side-btn">
                        확인
                      </button>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-email-local">
                        이메일 주소 <span>(필수)</span>
                      </label>
                      <div className="signup-email-layout">
                        <div className="signup-email-composite">
                          <input
                            id="su-email-local"
                            name="emailLocal"
                            type="text"
                            className="signup-email-id"
                            placeholder="이메일 아이디"
                            value={signupForm.emailLocal}
                            onChange={handleSignupChange}
                            autoComplete="off"
                          />
                          <span className="signup-email-sep signup-at" aria-hidden="true">
                            @
                          </span>
                          <input
                            name="emailHost"
                            type="text"
                            className="signup-email-domain"
                            placeholder="이메일 호스트"
                            value={signupForm.emailHost}
                            onChange={handleSignupChange}
                            autoComplete="off"
                          />
                          <select
                            className="signup-email-select"
                            defaultValue="직접입력"
                            aria-label="이메일 도메인 선택"
                          >
                            <option>직접입력</option>
                            <option>naver.com</option>
                            <option>gmail.com</option>
                            <option>daum.net</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="signup-field">
                      <label htmlFor="su-job">
                        직군 선택 <span>(필수)</span>
                      </label>
                      <select
                        id="su-job"
                        name="job"
                        className="signup-select"
                        value={signupForm.job}
                        onChange={handleSignupChange}
                      >
                        <option value="">옵션을 선택하세요</option>
                        <option value="developer">개발자</option>
                        <option value="designer">디자이너</option>
                        <option value="planner">기획자</option>
                        <option value="general">일반인</option>
                        <option value="etc">기타</option>
                      </select>
                    </div>

                    <div className="signup-actions">
                      <button type="button" className="signup-back-btn" onClick={onGoLogin}>
                        Back
                      </button>
                      <button type="submit" className="auth-primary-btn signup-submit-btn">
                        Sign Up
                      </button>
                    </div>

                    <p className="auth-panel-switch auth-panel-switch--signup">
                      이미 계정이 있으신가요?{' '}
                      <button type="button" className="auth-inline-link" onClick={onGoLogin}>
                        Login
                      </button>
                    </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthPanel;
