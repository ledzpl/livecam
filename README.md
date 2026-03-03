# LiveCam Viewer

유튜브 라이브 방송을 검색해서 지도 위 마커로 보여주는 Next.js 앱입니다.

## 기능

- YouTube Live 검색 API(`/api/live-streams`)
- 아시아 지역(서울/부산/도쿄/오사카/타이베이/홍콩/싱가포르/방콕) 우선 탐색
- 방송 제목/설명 기반 도시 매칭 후 지도 마커 표시
- 마커 또는 목록 클릭 시 YouTube 임베드 모달 재생
- 지도 이동/줌 변경 시 현재 영역 기준으로 라이브 방송 재검색
- 줌 레벨에 따라 검색 시드 수를 줄여 API 호출량 제어
- 모바일/데스크톱 반응형 레이아웃

## 요구 환경

- Node.js 20+
- YouTube Data API v3 키

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

## 환경 변수

- `YOUTUBE_API_KEY`: 서버에서 라이브 목록 조회

## Vercel 배포

1. Vercel에 레포 연결
2. Project Settings > Environment Variables에 아래 값 등록
   - `YOUTUBE_API_KEY`
3. Deploy

## 참고

- 현재 구현은 시드 도시(`Seoul`, `Busan`, `Tokyo`, `Osaka`, `Taipei`, `Hong Kong`, `Singapore`, `Bangkok`) 중심으로 라이브를 탐색합니다.
- 지도는 OpenStreetMap 타일 + Leaflet으로 렌더링되며 별도 지도 API 키가 필요 없습니다.
- YouTube 검색 API는 호출당 quota 소모가 크므로, 프로덕션에서는 캐싱/갱신 주기 조정이 필요합니다.
