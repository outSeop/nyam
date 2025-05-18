require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Fine = require('./models/Fine');

const app = express();

// 보안 설정
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] // 배포된 도메인으로 변경
        : 'http://localhost:3001'
}));

// 요청 제한 설정
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100 // IP당 최대 요청 수
});
app.use(limiter);

app.use(express.json());

// 정적 파일 제공 (build 디렉토리 사용)
app.use(express.static(path.join(__dirname, 'build')));

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// API 엔드포인트
// 모든 벌금 조회
app.get('/api/fines', async (req, res) => {
    try {
        const fines = await Fine.find().sort({ date: -1 });
        res.json(fines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 벌금 추가
app.post('/api/fines', async (req, res) => {
    try {
        const fine = new Fine(req.body);
        await fine.save();
        res.status(201).json(fine);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 벌금 삭제
app.delete('/api/fines/:id', async (req, res) => {
    try {
        const fine = await Fine.findByIdAndDelete(req.params.id);
        if (!fine) {
            return res.status(404).json({ error: '벌금 내역을 찾을 수 없습니다.' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// OpenAI API 프록시
app.post('/api/recommendation', async (req, res) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 모든 요청을 index.html로 라우팅 (SPA 지원)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 