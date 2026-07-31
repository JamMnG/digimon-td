# 디지몬 타워 디펜스

진화가 곧 업그레이드인 타워 디펜스. 순수 HTML + CSS + ES 모듈이라 **빌드 과정이 없다**.
외부 라이브러리·CDN·서버 코드가 하나도 없고, 저장은 브라우저 localStorage를 쓴다.

- 전체 34개 파일 / 328 KB
- 진행도는 브라우저마다 따로 저장된다 (기기·브라우저를 옮기면 처음부터)

---

## ⚠️ 먼저 알아둘 것 — 압축해서 보내면 안 열린다

`index.html`을 더블클릭하거나 압축을 풀어 열면 **빈 화면**이 나온다.
ES 모듈(`<script type="module">`)은 브라우저 보안 규칙상 `file://` 에서 로드되지 않는다.
반드시 **웹 주소(http/https)로 서비스**해야 한다. 아래 방법 중 하나를 쓰면 된다.

---

## 방법 1. Netlify Drop — 가장 빠름 (1분, 계정 없이 시작)

1. https://app.netlify.com/drop 접속
2. `digimon-td` **폴더째로** 드래그해서 놓기
3. 바로 `https://무작위이름.netlify.app` 주소가 나온다 → 친구에게 전달

무료 계정을 만들면 주소를 고정하고 이름도 바꿀 수 있다.
파일을 고친 뒤에는 폴더를 다시 드래그하면 갱신된다.

## 방법 2. GitHub Pages — 주소가 안 바뀜, 버전 관리까지

```bash
cd D:/poly/digimon-td
git init
git add .
git commit -m "디지몬 타워 디펜스"
git branch -M main
git remote add origin https://github.com/<아이디>/digimon-td.git
git push -u origin main
```

그다음 GitHub 저장소 → **Settings → Pages → Source: `main` / `(root)`** 저장.
1~2분 뒤 `https://<아이디>.github.io/digimon-td/` 에서 열린다.
(하위 경로 배포도 정상 동작하도록 모든 경로가 상대경로로 되어 있다.)

## 방법 3. itch.io — 게임 배포에 맞는 곳

1. `digimon-td` 폴더 내용물을 zip으로 압축 (폴더가 아니라 **`index.html`이 zip 최상단**에 오도록)
2. itch.io → Dashboard → Create new project
3. **Kind of project: HTML** 선택 → zip 업로드
4. *This file will be played in the browser* 체크
5. Viewport 는 `1280 × 800` 정도 권장

친구들에게 링크만 주면 브라우저에서 바로 플레이된다.

## 방법 4. 같은 와이파이에 있을 때만 — 내 PC에서 바로

```bash
cd D:/poly/digimon-td
py -m http.server 8080 --bind 0.0.0.0
```

내 PC의 IP를 확인해서(`ipconfig`) 친구에게 `http://<내IP>:8080` 을 알려준다.
내 PC가 켜져 있고 같은 네트워크일 때만 되며, 방화벽에서 8080 허용이 필요할 수 있다.

---

## 로컬에서 실행 (개발용)

```bash
cd D:/poly/digimon-td
py -m http.server 5175
```

브라우저에서 `http://localhost:5175` 접속.

---

## 참고

- **모바일**: 레이아웃은 좁은 화면까지 대응돼 있고 터치로도 조작된다. 다만 보드가 작아지므로 가로 화면을 권한다.
- **저장 데이터 초기화**: 타이틀 화면 오른쪽 아래 `진행도 초기화`.
- **IP**: 디지몬 이름·색·도트는 전부 `src/data/monsters.js` 와 `src/render/monsterSprites.js` 에만 있다.
  개인적으로 친구들과 돌려보는 범위를 넘어 공개 배포하거나 수익화할 계획이라면
  이 두 파일의 이름·외형을 오리지널로 교체해야 한다. (자세한 내용은 `../docs/digimon-td-report.md` 0장)
