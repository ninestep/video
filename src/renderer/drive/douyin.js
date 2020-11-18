const puppeteer = require('puppeteer')
const fs = require('fs')
async function douyin (filePath, message) {
  const browser = await puppeteer.launch({
    headless: false
  })
  const cookieName = 'douyinCookies'
  let cookies = []
  let login = false
  try {
    cookies = JSON.parse(fs.readFileSync(cookieName))
    login = true
  } catch (e) {
    login = false
  }
  let url = 'https://creator.douyin.com/'
  const page = await browser.newPage()
  if (cookies.length > 0) {
    for (let cookie of cookies) {
      if (!cookie.expires) {
        cookie.expires = Date.now() + 3600 * 1000
      }
      await page.setCookie(cookie)
    }
    url = 'https://creator.douyin.com/content/upload'
  }
  await page.goto(url)
  try {
    await page.waitForSelector('#root > div > section > section > main > div > div > div.container--1GAZf > div > label > input', 3000)
  } catch (e) {
    login = false
  }
  if (login) {
    let uploadElement = await page.$('#root > div > section > section > main > div > div > div.container--1GAZf > div > label > input')
    uploadElement.uploadFile(filePath)
    await page.waitForSelector('#root > div > section > section > main > div > div > div.content-body--1XCPO > div.form--2xPFu > div:nth-child(1) > p > span', 3000)
    console.log('写入信息')
    let [element] = await page.$x('//*[@id="root"]/div/section/section/main/div/div/div[2]/div[1]/div[2]/div[1]')
    console.log(element)
    await element.type('asdasdasdasdasdasda')
  } else {
    await page.waitForSelector('#root > div > section > header > div.creator-header-wrapper > div > div > div > div.semi-navigation-footer > span', 3000)
    await page.click('#root > div > section > header > div.creator-header-wrapper > div > div > div > div.semi-navigation-footer > span')
    await page.waitForSelector('#dialog-0 > div', 3000)
    await page.click('#dialog-0 > div > div.semi-modal-body > div > form > div.btn > button')
    await page.waitForSelector('#dialog-0 > div > div.semi-modal-body > div > div.semi-tabs-bar.semi-tabs-bar-line.semi-tabs-bar-top', 3000)
    console.log('请扫描二维码登录,等待30秒')
    await page.waitForSelector('#root > div > div.content--3ncCf.creator-content > div.sider--137Dm > div > div > div > div.semi-navigation-header > button', 3000)
    console.log('已登陆')
    cookies = await page.cookies()
    fs.writeFileSync(cookieName, JSON.stringify(cookies))
    page.close()
    browser.close()
    douyin()
  }
}
douyin('E:\\文档\\Videos\\youtube\\头条\\啊实打实.mp4', '我要测试以西能不能用')
