const API_URL = "https://nettle-ringed-chokeberry.glitch.me/"; // Базовый URL для API
const LOCATION_URL = "api/locations"; // URL для получения списка локаций
const VACANCY_URL = "api/vacancy"; // URL для получения списка вакансий
const BOT_TOKEN = "6516125185:AAFf4FQwrfPSLtIy5EtfBYiPPIaQI5BkEfo"; // Токен для бота Telegram
const cardsList = document.querySelector('.cards__list'); // Список карточек вакансий
const pagination = {}; // Объект для хранения данных о пагинации
let lastUrl = ''; // Последний URL, используется для загрузки дополнительных вакансий

// Функция для получения данных с сервера
const getData = async (url, cbSuccess, cbError) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        cbSuccess(data);
    } catch (err) {
        cbError(err);
    }
};

// Функция для создания карточки вакансии
const createCard = ({ id, logo, company, title, salary, type, format, experience }) => `
<article class="vacancy" data-id="${id}">
    <img src="${API_URL}${logo}" alt="Лого ${company}" class="vacancy__img">
    <p class="vacancy__company">${company}</p>
    <h3 class="vacancy__title">${title}</h3>
    <ul class="vacancy__fields">
        <li class="vacancy__field">от ${parseInt(salary).toLocaleString()}₽</li>
        <li class="vacancy__field">${type}</li>
        <li class="vacancy__field">${format}</li>
        <li class="vacancy__field">${experience}</li>
    </ul>
</article>
`;

// Функция для создания массива карточек вакансий
const createCards = (data) => {
   return data.vacancies.map(vacancy => {
        const li = document.createElement('li');
        li.classList.add('cards__item');
        li.innerHTML = createCard(vacancy);         
        return li;
    })
};

// Функция для отображения списка вакансий
const renderVacancies = (data) => {
    cardsList.textContent = '';
    const cards = createCards(data);
    cardsList.append(...cards);
    if(data.pagination) {
        Object.assign(pagination, data.pagination);
    }
    observer.observe(cardsList.lastElementChild);
};

// Функция для добавления дополнительных вакансий при прокрутке
const renderMoreVacancies = (data) => {
    const cardsList = document.querySelector('.cards__list');
    const cards = createCards(data);
    cardsList.append(...cards);
    if(data.pagination) {
        Object.assign(pagination, data.pagination);
    }
    observer.observe(cardsList.lastElementChild);
};

// Функция для загрузки дополнительных вакансий
const loadMoreVacancies = () => {
    if (pagination.totalPages > pagination.currentPage) {
        const urlWithParams =  new URL(lastUrl);
        urlWithParams.searchParams.set('page', pagination.currentPage + 1);        
        urlWithParams.searchParams.set('limit', window.innerWidth < 768 ? 6 : 12);
        getData(urlWithParams, renderMoreVacancies, renderError).then(() => {
            lastUrl = urlWithParams;
        });
    }
};

// Функция для отображения ошибок
const renderError = err => {
    console.warn(err);
};

// Функция для создания HTML-кода детальной информации о вакансии
const createDetailVacancy = ({id, logo, company, title, description, salary, type, format, experience, location, email }) => {
    return `
    <article class="detail__main">
        <div class="detail__header">
            <img src="${API_URL}${logo}" alt="Лого ${company}" class="detail__logo">
            <p class="detail__company">${company}</p>
            <h2 class="detail__title">${title}</h2>                    
        </div>
        <div class="detail__info">
            <p class="detail__description">
            ${description.replaceAll('\n', '<br>')}
            </p>                    
            <ul class="detail__fields">
                <li class="detail__field">от ${parseInt(salary).toLocaleString()}₽</li>
                <li class="detail__field">${type}</li>
                <li class="detail__field">${format}</li>
                <li class="detail__field">${experience}</li>
                <li class="detail__field">${location}</li>
            </ul>
        </div>

        ${isNaN(parseInt(id.slice(-1))) ?
            `<p class="detail__resume">Отправляйте резюме на
                <a class="detail__link" href="mailto:${email}">${email}</a>
            </p>`
            :
            `
            <form class="detail__tg">
            <input class="detail__input" type="text" name="message" placeholder="Ваш Email" required>
            <input name="vacancyId" type="hidden" value="${id}">
            <button class="detail__btn">Отправить</button>
            </form>
            `
        }
    </article>
    `
}

// Функция для отправки сообщения в Telegram
const sendTelegramm = (modal) => {
    modal.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target.closest('.detail__tg');
        const userId = ''; // ID пользователя полученный от 'userinfobot' в Telegram
        const text = `Отклик на вакансию ${form.vacancyId.value}, email:" ${form.message.value}`;
        const urlBot = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${userId}&text=${text}`;
        fetch(urlBot)
        .then(res => alert('Отклик отправлен!'))
        .catch(err => alert('Ошибка'));
    })
}

// Функция для отображения модального окна с детальной информацией о вакансии
const renderModal = (data) => {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    const modalMain = document.createElement('div');
    modalMain.classList.add('modal__main');
    modalMain.innerHTML = createDetailVacancy(data);
    const modalClose = document.createElement('button');
    modalClose.classList.add('modal__close');
    modalClose.innerHTML = `
    <img src="./images/close.svg">  
    `
    modalMain.append(modalClose);
    modal.append(modalMain);
    document.body.append(modal);

    modal.addEventListener('click', ({target}) => {
        if (target === modal || target.closest('.modal__close')) {
            modal.remove();
        }
    });

    sendTelegramm(modal);
};

// Функция для открытия модального окна с детальной информацией о вакансии
const openModal = (id) => {
    getData(`${API_URL}${VACANCY_URL}/${id}`, renderModal, renderError);
}

// Наблюдатель за прокруткой для автоматической подгрузки вакансий
const observer = new IntersectionObserver (
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadMoreVacancies();
            }
        })
    }, {
        rootMargin: '100px',
    },
)

// Инициализация при загрузке страницы
const init = () => {
    try {
        const filterForm = document.querySelector('.filter__form');
    const citySelect = document.querySelector('#city');

    // cityChoices.js
    const cityChoices = new Choices(citySelect, {
        searchEnabled: true,
        itemSelectText: "",
        searchEnabled: false,
    });

    // Получение списка локаций и их отображение в выпадающем списке
    getData(
        `${API_URL}${LOCATION_URL}`, 
        (locationData) => {
            const locations = locationData.map((location) => ({value: location}));
            cityChoices.setChoices(locations, "value", "label", false);
        },
        (err) => {
           console.log(err);
        }
    );
    
    const urlWithParams = new URL(`${API_URL}${VACANCY_URL}`);
    urlWithParams.searchParams.set('limit', window.innerWidth < 768 ? 6 : 12);
    urlWithParams.searchParams.set('page', 1);

    // Загрузка и отображение списка вакансий при загрузке страницы
    getData(urlWithParams, renderVacancies, renderError).then(() => {
        lastUrl = urlWithParams;
    });

    // Обработчик клика на карточке вакансии для открытия детальной информации
    cardsList.addEventListener('click', ({target}) => {
        const vacancyCard = target.closest('.vacancy');
        if (vacancyCard) {
            const vacancyId = vacancyCard.dataset.id;
            openModal(vacancyId);
        }
    });

    // Обработчик для открытия формы фильтра на мобильных устройствах
    const filterButton = document.querySelector(".vacancies__filter-btn");
    const filterSection = document.querySelector(".vacancies__filter");

    filterButton.addEventListener("click", () => {
    filterSection.style.height = "auto";
    });

    // Обработчик отправки формы фильтра
    filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(filterForm);
        const urlWithParam = new URL(`${API_URL}${VACANCY_URL}`);

        formData.forEach((value, key) => {
            urlWithParam.searchParams.append(key, value);
        });        

        // Загрузка и отображение отфильтрованного списка вакансий
        getData(urlWithParam, renderVacancies, renderError).then(() => {
            lastUrl = urlWithParam;
        });
    });
    } catch (error) {
        console.log("error: ", error);
        console.warn("Вы не на странице index.html");
    }

    // Валидация Employer формы - JustValidate library
    try {
        const validateForm = (form) => {
            const validate = new JustValidate(form, {                
                // стиль label
                errorLabelStyle: {
                    color:"#b81111",                         
                    // border: "1px solid #B81111",       
                    // background: "orange",                   
                },
                // стиль radio
                errorFieldStyle: {
                    color: "#b81111",
                    border: "1px solid #B81111",                    
                },
                tooltip: {
                    position: "top",
                }
            });
            validate                
                .addField('#logo', [
                    {
                        rule: 'minFilesCount',
                        value: 1,
                        errorMessage: "Загрузите лого!"
                    },      
                    {
                        rule: 'files',
                        value: {
                          files: {
                            extensions: ['jpg', 'jpeg', 'png'],
                            maxSize: 102400,
                            minSize: 1000,
                            types: ['image/jpg','image/jpeg', 'image/png'],                                                     
                          },
                        },     
                        errorMessage: 'Загруженные файлы имеют одно или несколько недопустимых свойств (расширение/размер/тип и т. д.).'                   
                      },                    
                ])
                .addField('#company', [
                    {rule: 'required', errorMessage: "Заполните поле!"},
                ])
                .addField('#title', [
                    {rule: 'required', errorMessage: "Заполните поле!"}
                ])
                .addField('#salary', [
                    {rule: 'required', errorMessage: "Заполните поле!"}
                ])
                .addField('#location', [
                    {rule: 'required', errorMessage: "Заполните поле!"}
                ])
                .addField('#email', [
                    {rule: 'required', errorMessage: "Заполните поле!"},
                    {rule: 'email', errorMessage: "Email имеет неверный формат!<br> Пример: contact@mail.com"},
                ])
                .addField('#description', [
                    {rule: 'required', errorMessage: "Заполните поле!"},
                ])
                .addRequiredGroup('#format', 'Выберите один вариант!', {
                    successMessage: 'Отлично!',
                })
                .addRequiredGroup('#workexp', 'Выберите один вариант!', {
                    successMessage: 'Отлично!',
                })
                .addRequiredGroup('#worktime', 'Выберите один вариант!', {
                    successMessage: 'Отлично!',
                });

                return validate;
                
        };

    // Функция для файлов лого
    const fileController = () => {
        const file = document.querySelector(".file");

        // Получаем элементы превью и инпута файла
        const preview = file.querySelector(".file__preview");
        const input = file.querySelector(".file__input");

        // Добавляем обработчик события изменения файла
        input.addEventListener('change', (event) => {
            // Проверяем, есть ли выбранные файлы
            if (event.target.files.length > 0) {
                // Получаем URL первого выбранного файла
                const src = URL.createObjectURL(event.target.files[0]);

                // Добавляем класс активности элементу файла
                file.classList.add('file__active');

                // Устанавливаем URL превью
                preview.src = src;

                // Показываем превью
                preview.style.display = 'block';
            } else {
                // Скрываем превью
                preview.style.display = 'none';
            }
        });
    };

    // Функция для формы
    const formControl = () => {
        // Получаем элемент формы
        const form = document.querySelector('.employer__form');

        // Валидируем форму
        const validate = validateForm(form);

        // Добавляем обработчик события отправки формы
        form.addEventListener("submit", async (event) => {            
            event.preventDefault();            

            if (!validate.isValid) {
                return;
            }

            try {
                const formData = new FormData(form)
                       
                const response = await fetch (`${API_URL}${VACANCY_URL}`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                alert("Вакансия добавлена!");
                window.location.href = "index.html";
            }
            } catch (error) {
                console.log('error: ', error);
                alert('error: ', error);
            }            
        });
    };

    // Вызываем функции файлов и формы
    formControl();
    fileController();

            
        } catch (error) {
            console.log("error: ", error);
            console.warn("Вы не на странице employer.html");
        }
        
    };

    // Вызов функции инициализации при загрузке страницы
init();

// Функция ограничения ввода чисел
const inputNumberController = () => {
    // Получаем все элементы ввода типа "number"
    const inputNumberElems = document.querySelectorAll('input[type="number"]');
  
    // Перебираем все элементы ввода
    inputNumberElems.forEach((input) => {
  
      // Инициализируем переменную для хранения предыдущего значения ввода
      let previousValue = "";
  
      // Добавляем обработчик события ввода для каждого элемента ввода
      input.addEventListener("keydown", (event) => {
  
        // Если нажатая клавиша не является цифрой, то не вызываем событие "input"
        if (!event.key.match(/[0-9]/)) {
          event.preventDefault();
        }
  
        // Получаем текущее значение ввода
        const currentValue = event.target.value;

        // Если введенное значение не является числом, то устанавливаем предыдущее значение ввода
        if (isNaN(parseInt(currentValue)) && currentValue !== "") {
          input.value = previousValue;
        } else {
          // Обновляем переменную для хранения предыдущего значения ввода
          previousValue = currentValue;
        }

        // Обрабатываем нажатие клавиши Backspace
        if (event.key === "Backspace") {
            // Удаляем один символ из ввода
            input.value = input.value.slice(0, -1);
          }
          
      });
    });
  };
  
  // Вызываем функцию
  inputNumberController();
  
