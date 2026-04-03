import React from "react";
import "./Signup.css";

function Signup({ onBack }) {

  return (
    <div className="signup-page">

      <div className="signup-container">

        <h1>회원가입</h1>

        <div className="signup-form">

          <input placeholder="이름" />

          <div className="row">
            <input placeholder="아이디" />
            <button>중복확인</button>
          </div>

          <input placeholder="비밀번호" />
          <input placeholder="비밀번호 확인" />

          <div className="row">
            <input placeholder="휴대폰 번호" />
            <button>인증</button>
          </div>

          <div className="row">
            <input placeholder="인증번호" />
            <button>확인</button>
          </div>

          <div className="row">
            <input placeholder="이메일" />
            <select>
              <option>naver.com</option>
              <option>gmail.com</option>
              <option>daum.net</option>
            </select>
          </div>

          <select>
            <option>직군 선택</option>
            <option>개발자</option>
            <option>디자이너</option>
            <option>기획자</option>
          </select>

          <div className="signup-actions">

            <button
              className="back-btn"
              onClick={onBack}
            >
              Back
            </button>

            <button className="submit-btn">
              Sign Up
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Signup;