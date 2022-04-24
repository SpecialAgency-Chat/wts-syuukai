const { prompt } = require("enquirer");
const fs = require("fs");
const discord = require("freeze-selfbot");
const crypto = require("crypto");
const sjcl = require("sjcl");
const ora = require("ora");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const chalk = require("chalk");
const { replace } = require("decoration-replace");

const names = ["wts", "want-to-sell"];
const key = "5c9d64072a706ef5c0e394ce415e5da66450c38162cb6929e23c4966625ae660";


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const syuukai = async (client) => {
  const savedData = fs.readFileSync(
    path.join(os.homedir(), ".wts-syuukai.config"),
    "utf8"
  );
  const cc = sjcl.decrypt(
    key,
    Buffer.from(savedData, "base64").toString("utf8")
  );
  const dt = JSON.parse(cc);
  const { token, data, channels, time } = dt;
  const isClientExist = client ? true : false;
  client = client || new discord.Client();
  if (!isClientExist) await client.login(token);
  channels.map((x) => {
    const c = client.channels.get(x);
    if (c) {
      c.send(data)
        .then(() => {
          console.log(
            chalk.green(
              `[${chalk.green("+")}] ${c.name}(${x}) への投稿に成功しました。`
            )
          );
        })
        .catch((e) => {
          console.log(
            chalk.red(
              `[${chalk.red("-")}] ${
                c.name
              }(${x}) への投稿に失敗しました。(${e})`
            )
          );
        });
    } else {
      console.log(`[${chalk.red("-")}] ${x} は存在しません。`);
    }
  });
  return client;
};

/**
 * @param {string} token
 * @param {string} data
 * @param {ora.Ora} spinner
 */
const tugi = (token, data, spinner) => {
  const spawnObj = spawn("C:\\Windows\\notepad.exe", [
    path.join(os.homedir(), "WTS-CHANNEL.txt"),
  ]);
  spawnObj.on("spawn", () => {
    spinner.text = `WTSのチャンネルを抽出しました。追加・削除するものがあればそのIDをいじってください。 // のあとは1行コメントです。`;
  });
  spawnObj.on("close", async () => {
    spinner.succeed("メモ帳が閉じられました。");
    const channels = fs
      .readFileSync(path.join(os.homedir(), "WTS-CHANNEL.txt"), "utf8")
      .split("\n")
      .map((x) => x.split("//")[0].trim());
    const rawChannels = fs
      .readFileSync(path.join(os.homedir(), "WTS-CHANNEL.txt"), "utf8")
      .split("\n")
    fs.unlinkSync(path.join(os.homedir(), "WTS-CHANNEL.txt"));
    const { time } = await prompt({
      type: "numeral",
      name: "time",
      message: "投稿する周期を入れてください(分)",
      initial: "30",
      validate(value) {
        if (+value < 1) {
          return "1以上の数字を入れてください。";
        }
        return true;
      },
    });
    spinner = ora("保存中...");
    const dt = {
      token,
      data,
      channels,
      rawChannels,
      time,
    };
    const c = sjcl.encrypt(key, JSON.stringify(dt));
    fs.writeFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      Buffer.from(c).toString("base64")
    );
    spinner.succeed("保存しました。");
    console.log(`[${chalk.green("+")}] 投稿を開始します。(${time})分おき`);
    const client = await syuukai(null);
    setInterval(async () => syuukai(client), time * 60 * 1000);
  });
};

const syokai = async (spinner) => {
  spinner.info("設定ファイルが見つかりませんでした。");
  const { token } = await prompt({
    type: "input",
    name: "token",
    message: "周回に使うDiscordアカウントのTokenを入力してください。",
    validate(value) {
      if (value.length < 1) {
        return "Tokenを入力してください。";
      }
      if (
        !value.match(
          /^[a-zA-Z0-9-_]{21,26}\.[a-zA-Z0-9-_]{4,8}\.[a-zA-Z0-9-_]{23,29}$/
        ) &&
        !value.match(/^mfa.[a-zA-Z0-9_-]{20,60}/)
      ) {
        return "Tokenが不正です。";
      }
      return true;
    },
  });
  if (token.match(/^mfa\./)) spinner.warn("MFAトークンは不安定です。");
  spinner = ora(
    "メモ帳を起動しています。起動したら、そこにWTSに投稿する内容を記載してください。(保存を忘れずに)"
  ).start();
  fs.writeFileSync(path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"), "");
  const progToOpen = spawn("C:\\windows\\notepad.exe", [
    path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"),
  ]);
  progToOpen.on("spawn", () => {
    spinner.text =
      "メモ帳に、WTSに投稿する内容を記載してください。(保存を忘れずに)終わったらメモ帳を閉じてください";
  });
  progToOpen.on("close", async () => {
    spinner.succeed("メモ帳が閉じられました。");
    const data = fs.readFileSync(
      path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"),
      "utf8"
    );
    fs.unlinkSync(path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"));
    if (data.length < 1) {
      spinner.fail("保存された内容が空です。\n最初からやり直してください。");
      return await sleep(100000);
    }
    spinner = ora("Tokenを検証しています...").start();
    const client = new discord.Client();
    client
      .login(token)
      .then(() => {
        spinner.succeed("Tokenが正しいです。");
        console.log(`ユーザー: ${chalk.cyan.bold(client.user.tag)}`);
        spinner = ora("WTSチャンネルを抽出しています...").start();
        const channel = client.channels.filter((c) => {
          return (
            c.name &&
            names.some((x) => replace(c.name.toLowerCase()).includes(x)) &&
            c
          );
        });
        fs.writeFileSync(
          path.join(os.homedir(), "WTS-CHANNEL.txt"),
          channel
            .map((x) => `${x.id} //${x.guild.name}  -  ${x.name}`)
            .join("\n")
        );
        
        tugi(token, data, spinner);
        client.destroy();
      })
      .catch(async (e) => {
        console.log(e);
        spinner.fail("Tokenが死んでいます。\n最初からやり直してください。");
        return await sleep(100000);
      });
  });
};

const menu = async (spinner) => {
  const { yarukoto } = await prompt([
    {
      type: "select",
      name: "yarukoto",
      message: "やることを選択してください。",
      choices: [
        {
          name: "周回モード",
          value: "syuukai",
        },
        {
          name: "文章を編集",
          value: "edit-data",
        },
        {
          name: "チャンネルを編集",
          value: "edit-channel",
        },
        {
          name: "Tokenを編集",
          value: "edit-token",
        },
        {
          name: "投稿周期を編集",
          value: "edit-time",
        },
        {
          name: "終了",
          value: "exit",
        },
      ],
    },
  ]);
  if (yarukoto === "syuukai" || yarukoto === "周回モード") {
    const dd = fs.readFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      "utf8"
    );
    const cc = sjcl.decrypt(key, Buffer.from(dd, "base64").toString());
    const dt = JSON.parse(cc);

    console.log(`[${chalk.green("+")}] 投稿を開始します`);
    const client = await syuukai();
    setInterval(async () => syuukai(client), dt.time * 60 * 1000);
  } else if (yarukoto === "edit-data" || yarukoto === "文章を編集") {
    const dd = fs.readFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      "utf8"
    );
    const cc = sjcl.decrypt(key, Buffer.from(dd, "base64").toString());
    const dt = JSON.parse(cc);
    spinner = ora(
      "メモ帳を起動しています。起動したら、そこにWTSに投稿する内容を記載してください。(保存を忘れずに)"
    ).start();
    fs.writeFileSync(path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"), dt.data);
    const progToOpen = spawn("C:\\windows\\notepad.exe", [
      path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"),
    ]);
    progToOpen.on("spawn", () => {
      spinner.text =
        "メモ帳に、WTSに投稿する内容を記載してください。(保存を忘れずに)終わったらメモ帳を閉じてください";
    });
    progToOpen.on("close", () => {
      spinner.succeed("メモ帳が閉じられました。");
      const data = fs.readFileSync(
        path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"),
        "utf8"
      );
      fs.unlinkSync(path.join(os.homedir(), "TEMP-WTS-SYUUKAI.txt"));
      if (data.length < 1) {
        spinner.fail("保存された内容が空です。\n最初からやり直してください。");
        return;
      }
      dt.data = data;
      fs.writeFileSync(
        path.join(os.homedir(), ".wts-syuukai.config"),
        Buffer.from(sjcl.encrypt(key, JSON.stringify(dt))).toString("base64")
      );
      console.log(`[${chalk.green("+")}] データを更新しました。`);
      return menu(spinner);
    });
  } else if (yarukoto === "edit-channel" || yarukoto === "チャンネルを編集") {
    const dd = fs.readFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      "utf8"
    );
    const cc = sjcl.decrypt(key, Buffer.from(dd, "base64").toString());
    const dt = JSON.parse(cc);
    spinner = ora("WTSチャンネルを起動しています...").start();
    fs.writeFileSync(path.join(os.homedir(), "WTS-CHANNEL.txt"), dt.rawChannels.join("\n"));
    const progToOpen = spawn("C:\\windows\\notepad.exe", [
      path.join(os.homedir(), "WTS-CHANNEL.txt"),
    ]);
    progToOpen.on("spawn", () => {
      spinner.text =
        "WTSチャンネルを記載してください。(保存を忘れずに)終わったらメモ帳を閉じてください";
    });
    progToOpen.on("close", () => {
      spinner.succeed("メモ帳が閉じられました。");
      const data = fs.readFileSync(
        path.join(os.homedir(), "WTS-CHANNEL.txt"),
        "utf8"
      );
      fs.unlinkSync(path.join(os.homedir(), "WTS-CHANNEL.txt"));
      if (data.length < 1) {
        spinner.fail("保存された内容が空です。\n最初からやり直してください。");
        return;
      }
      dt.rawChannels = data.split("\n");
      const channels = data.split("\n")
        .map((x) => x.split("//")[0].trim());
      dt.channels = channels;
      fs.writeFileSync(
        path.join(os.homedir(), ".wts-syuukai.config"),
        Buffer.from(sjcl.encrypt(key, JSON.stringify(dt))).toString("base64")
      );

      console.log(`[${chalk.green("+")}] チャンネルを更新しました。`);
      return menu(spinner);
    });
  } else if (yarukoto === "edit-token" || yarukoto === "Tokenを編集") {
    const dd = fs.readFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      "utf8"
    );
    const cc = sjcl.decrypt(key, Buffer.from(dd, "base64").toString());
    const dt = JSON.parse(cc);
    const { newToken } = await prompt([
      {
        type: "input",
        name: "newToken",
        message: "新しいTokenを入力してください。",
        validate: (value) => {
          if (value.length < 1) {
            return "Tokenを入力してください。";
          }
          return true;
        }
      },
    ]);
    dt.token = newToken;
    fs.writeFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      Buffer.from(sjcl.encrypt(key, JSON.stringify(dt))).toString("base64")
    );
    console.log(`[${chalk.green("+")}] Tokenを更新しました。`);
    return menu(spinner);
  } else if (yarukoto === "edit-time" || yarukoto === "投稿周期を編集") {
    const dd = fs.readFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      "utf8"
    );
    const cc = sjcl.decrypt(key, Buffer.from(dd, "base64").toString());
    const dt = JSON.parse(cc);
    const { newTime } = await prompt([
      {
        type: "numeral",
        name: "newTime",
        message: "投稿時間を入力してください。",
        validate: (value) => {
          if (value.length < 1) {
            return "投稿時間を入力してください。";
          }
          return true;
        }
      },
    ]);
    dt.time = newTime;
    fs.writeFileSync(
      path.join(os.homedir(), ".wts-syuukai.config"),
      Buffer.from(sjcl.encrypt(key, JSON.stringify(dt))).toString("base64")
    );
    console.log(`[${chalk.green("+")}] 投稿時間を更新しました。`);
    return menu(spinner);
  }
};

(async () => {
  process.title = "WTS周回";
  await sleep(1000);
  let spinner = ora("設定ファイルを探しています...").start();
  if (!fs.existsSync(path.join(os.homedir(), ".wts-syuukai.config"))) {
    return syokai(spinner);
  } else {
    spinner.succeed("設定ファイルが見つかりました。");
    return menu(spinner);
  }
})();

//💵┆𝐰𝐚𝐧𝐭-𝐭𝐨-𝐬𝐞𝐥𝐥
//💵┆want-to-sell

process.on("uncaughtException", (err) => {
  console.log("\nエラー出たよ開発者に報告してねー")
  console.log(err);
})