// 벌금 데이터를 저장할 배열
let fines = [];
let fineChart = null; // 차트 객체를 저장할 변수

// 페이지 로드 시 벌금 내역 표시
document.addEventListener('DOMContentLoaded', async () => {
    await loadFines();
});

// 벌금 데이터 로드
async function loadFines() {
    try {
        const response = await fetch('/api/fines');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패');
        }
        
        fines = result.data;
        updateFineList();
        updateTotalAmount();
        updateIndividualFines();
        updateFineChart();
    } catch (error) {
        console.error('벌금 데이터 로드 실패:', error);
        alert('벌금 데이터를 불러오는데 실패했습니다.');
    }
}

// 벌금 추가 함수
async function addFine() {
    const nameInput = document.getElementById('memberName');
    const amountInput = document.getElementById('fineAmount');
    
    const name = nameInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (!name || isNaN(amount) || amount <= 0) {
        alert('올바른 이름과 금액을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/fines', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, amount })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || '벌금 추가 실패');
        }
        
        await loadFines();
        
        // 입력 필드 초기화
        nameInput.value = '';
        amountInput.value = '';
    } catch (error) {
        console.error('벌금 추가 실패:', error);
        alert('벌금 추가에 실패했습니다.');
    }
}

// 벌금 내역 업데이트 함수
function updateFineList() {
    const fineList = document.getElementById('fineList');
    fineList.innerHTML = '';
    
    fines.forEach((fine) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${fine.name} - ${fine.amount.toLocaleString()}원 (${new Date(fine.date).toLocaleDateString()})</span>
            <button onclick="deleteFine('${fine._id}')" class="delete-btn">삭제</button>
        `;
        fineList.appendChild(li);
    });
}

// 총 벌금 금액 업데이트 함수
function updateTotalAmount() {
    const total = fines.reduce((sum, fine) => sum + fine.amount, 0);
    document.getElementById('totalAmount').textContent = total.toLocaleString();
}

// 개인별 납부 현황 업데이트 함수
function updateIndividualFines() {
    const individualFines = fines.reduce((acc, fine) => {
        if (!acc[fine.name]) {
            acc[fine.name] = 0;
        }
        acc[fine.name] += fine.amount;
        return acc;
    }, {});

    const individualFineList = document.getElementById('individualFineList');
    individualFineList.innerHTML = '';

    for (const name in individualFines) {
        const li = document.createElement('li');
        li.textContent = `${name}: ${individualFines[name].toLocaleString()}원`;
        individualFineList.appendChild(li);
    }
}

// 벌금 현황 차트 업데이트 함수
function updateFineChart() {
    const individualFines = fines.reduce((acc, fine) => {
        if (!acc[fine.name]) {
            acc[fine.name] = 0;
        }
        acc[fine.name] += fine.amount;
        return acc;
    }, {});

    const ctx = document.getElementById('fineChart').getContext('2d');
    
    const names = Object.keys(individualFines);
    const amounts = Object.values(individualFines);

    if (fineChart) {
        fineChart.destroy();
    }

    fineChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: names,
            datasets: [{
                label: '개인별 벌금',
                data: amounts,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toLocaleString() + '원';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


// 벌금 삭제 함수
async function deleteFine(id) {
    if (confirm('정말로 이 벌금 내역을 삭제하시겠습니까?')) {
        try {
            const response = await fetch(`/api/fines/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '벌금 삭제 실패');
            }
            
            await loadFines();
        } catch (error) {
            console.error('벌금 삭제 실패:', error);
            alert('벌금 삭제에 실패했습니다.');
        }
    }
}

// 맛집 추천 함수
async function getRecommendation() {
    const total = fines.reduce((sum, fine) => sum + fine.amount, 0);
    const recommendationDiv = document.getElementById('recommendation');
    
    if (total === 0) {
        recommendationDiv.textContent = '아직 모인 벌금이 없습니다.';
        return;
    }
    
    recommendationDiv.textContent = '추천을 불러오는 중...';
    
    try {
        const response = await fetch('/api/recommendation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "user",
                    content: `현재 모인 벌금이 ${total}원인데, 3명에서 나눠먹을 수 있는 맛있는 음식을 추천해주세요. 
                    가능한 예산을 전부 사용해서 추천해주세요.
                    예산에 맞는 메뉴와 가격도 함께 알려주세요. 
                    답변은 3-4문장으로 간단히 해주세요.`
                }]
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API 응답 형식이 올바르지 않습니다.');
        }
        
        recommendationDiv.textContent = data.choices[0].message.content;
    } catch (error) {
        recommendationDiv.textContent = `추천을 불러오는데 실패했습니다: ${error.message}`;
        console.error('Error:', error);
    }
}