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
        ? ['https://nyam-irf9.onrender.com'] // 배포된 도메인으로 변경
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

// 정적 파일 제공
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log('MongoDB Atlas 연결 성공');
    console.log('데이터베이스:', mongoose.connection.name);
})
.catch(err => {
    console.error('MongoDB Atlas 연결 실패:', err);
    process.exit(1);
});

// 연결 이벤트 리스너
mongoose.connection.on('error', err => {
    console.error('MongoDB 연결 오류:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 연결이 끊어졌습니다.');
});

// API 엔드포인트
// 모든 벌금 조회
app.get('/api/fines', async (req, res) => {
    try {
        console.log('벌금 조회 요청 받음');
        const fines = await Fine.find().sort({ date: -1 });
        console.log('조회된 벌금:', fines);
        res.json({ success: true, data: fines });
    } catch (error) {
        console.error('벌금 조회 중 오류:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            data: [] 
        });
    }
});

// 벌금 추가
app.post('/api/fines', async (req, res) => {
    try {
        const fine = new Fine(req.body);
        await fine.save();
        res.status(201).json({ success: true, data: fine });
    } catch (error) {
        console.error('벌금 추가 중 오류:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message,
            data: null 
        });
    }
});

// 벌금 삭제
app.delete('/api/fines/:id', async (req, res) => {
    try {
        const fine = await Fine.findByIdAndDelete(req.params.id);
        if (!fine) {
            return res.status(404).json({ 
                success: false, 
                error: '벌금 내역을 찾을 수 없습니다.',
                data: null 
            });
        }
        res.status(200).json({ 
            success: true, 
            data: fine 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message,
            data: null 
        });
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

// 모든 요청을 index.html로 라우팅
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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