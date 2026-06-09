 document.getElementById('forgotForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('submitBtn');
            const alertBox = document.getElementById('successAlert');
            const identity = document.getElementById('identity').value;

            // Feedback visual de processamento
            btn.innerHTML = 'Enviando...';
            btn.disabled = true;

            // Simulação de integração com Backend (PHP/REST)
            setTimeout(() => {
                alertBox.style.display = 'block';
                btn.style.display = 'none';
                document.getElementById('forgotForm').style.display = 'none';
                
                console.log("Solicitação de reset para: " + identity);
            }, 1500);
        });

        // Efeito de movimento no fundo (consistente com as outras telas)
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            document.querySelector('.forgot-card').style.transform = `translate(${moveX}px, ${moveY}px)`;
        });