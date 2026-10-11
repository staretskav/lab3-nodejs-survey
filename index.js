import { Command } from 'commander';
import fs from 'node:fs';

const program = new Command();

program
  .name('lab3')
  .description('CLI-програма для роботи з даними опитування')
  .version('1.0.0')
  .option('-f, --file <path>', 'Шлях до JSON-файлу', 'data.json');

// Функція читання JSON-файлу
function loadData() {
  const filePath = program.opts().file;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Помилка: файл "${filePath}" не знайдено.`);
    } else if (error instanceof SyntaxError) {
      console.error(`Помилка: некоректний JSON у файлі "${filePath}".`);
    } else {
      console.error(`Помилка читання файлу: ${error.message}`);
    }

    process.exitCode = 1;
    return null;
  }
}

// Команда hello
program
  .command('hello <name> [surname]')
  .description('Привітати користувача')
  .option('-g, --greeting <text>', 'Текст привітання', 'Привіт')
  .option('-u, --uppercase', 'Вивести привітання великими літерами')
  .action((name, surname, options) => {
    const fullName = surname ? `${name} ${surname}` : name;
    let message = `${options.greeting}, ${fullName}!`;

    if (options.uppercase) {
      message = message.toUpperCase();
    }

    console.log(message);
  });

// Команда list — перелік респондентів
program
  .command('list')
  .description('Показати перелік респондентів')
  .option('-l, --limit <number>', 'Максимальна кількість записів')
  .action((options) => {
    const data = loadData();
    if (!data) return;

    const responses = data.responses;
    let limit = responses.length;

    if (options.limit !== undefined) {
      limit = Number(options.limit);

      if (!Number.isInteger(limit) || limit <= 0) {
        console.error('Помилка: --limit має бути додатним цілим числом.');
        process.exitCode = 1;
        return;
      }
    }

    responses.slice(0, limit).forEach((response) => {
      console.log(`${response.respondentId} — ${response.submittedAt}`);
    });
  });

// Команда show — перегляд одного респондента
program
  .command('show <respondentId>')
  .description('Показати дані респондента за ідентифікатором')
  .action((respondentId) => {
    const data = loadData();
    if (!data) return;

    const respondent = data.responses.find(
      (response) => response.respondentId === respondentId
    );

    if (!respondent) {
      console.error(`Помилка: респондента "${respondentId}" не знайдено.`);
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(respondent, null, 2));
  });

// Команда field — отримання значення поля
program
  .command('field <respondentId> <path>')
  .description('Показати значення поля респондента')
  .action((respondentId, path) => {
    const data = loadData();
    if (!data) return;

    const respondent = data.responses.find(
      (response) => response.respondentId === respondentId
    );

    if (!respondent) {
      console.error(`Помилка: респондента "${respondentId}" не знайдено.`);
      process.exitCode = 1;
      return;
    }

    let value = respondent;

    for (const part of path.split('.')) {
      if (
        value === null ||
        typeof value !== 'object' ||
        !(part in value)
      ) {
        console.error(`Помилка: поле "${path}" не знайдено.`);
        process.exitCode = 1;
        return;
      }

      value = value[part];
    }

    if (value === null) {
      console.log('null');
    } else if (typeof value === 'object') {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(value);
    }
  });

// Обробка аргументів командного рядка
program.parse(process.argv);