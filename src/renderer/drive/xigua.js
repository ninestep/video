const puppeteer = require('puppeteer')
const fs = require('fs')
async function xigua (filePath, thumb, title = '', message = '') {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  }
  )
  const cookieName = 'xiguaCookies'
  let cookies = []
  let login = false
  try {
    cookies = JSON.parse(fs.readFileSync(cookieName))
    login = true
  } catch (e) {
    login = false
  }
  let url = 'https://studio.ixigua.com/welcome'
  const page = await browser.newPage()
  if (cookies.length > 0) {
    for (let cookie of cookies) {
      if (!cookie.expires) {
        cookie.expires = Date.now() + 3600 * 1000
      }
      await page.setCookie(cookie)
    }
    url = 'https://studio.ixigua.com/upload?from=post_article'
  }
  await page.goto(url)
  try {
    await page.waitForSelector('#app > div > section > div > div > div > div.xigua-upload-video-empty > div:nth-child(1) > div > div.byte-upload.xigua-upload-video-trigger.upload-video-trigger-card > div', 3000)
  } catch (e) {
    login = false
  }
  if (login) {
    let uploadElement = await page.$('#app > div > section > div > div > div > div.xigua-upload-video-empty > div:nth-child(1) > div > div.byte-upload.xigua-upload-video-trigger.upload-video-trigger-card > input[type=file]')
    await uploadElement.uploadFile(filePath)
    console.log('等待输入信息')
    await page.waitForSelector('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-title > div.video-form-item-wrapper > div.video-form-item-control > div > div > input')
    console.log('输入信息')
    if (title !== '') {
      page.type('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-title > div.video-form-item-wrapper > div > div > div > input', title)
    }
    if (message !== '') {
      page.type('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-abstract > div.video-form-item-wrapper > div > div > textarea', message)
    }
    await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-origin > div.video-form-item-wrapper > div > div > label:nth-child(1) > span > span')

    console.log('等待视频上传成功')
    await page.waitForSelector('#js-video-list-content > div > div.video-upload-status > div.top > div.right > div.status', {timeout: 300000})
    console.log('视频上传成功')
    await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-poster > div.video-form-item-wrapper > div.video-form-item-control > div > div')
    // 封面
    await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-poster > div.video-form-item-wrapper > div.video-form-item-control > div > div')
    while (true) {
      console.log('等待封面完成')
      try {
        await page.waitForSelector('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div:nth-child(2) > img')
      } catch (e) {
        let loading = await page.$('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > svg')
        let error = await page.$('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > div.btn-bg')
        if (!loading && !error) {
          console.log('封面获取失败，退出')
          break
        }
        if (error) {
          console.log('检测到错误，重新获取')
          await page.click('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > div.btn-bg')
        }
        if (loading) {
          console.log('正在获取，继续等待')
        }
      }
      break
    }
    console.log('选择封面')
    let [img] = await page.$x('/html/body/div[3]/div/div[2]/div/div[1]/div/div/div[1]/img')
    await img.click()
    await page.click('body > div.Dialog-container > div > div.m-content > div > div.footer.undefined > div')
    await page.waitForSelector('#tc-ie-base-content > div.tc-ie-base > div.base-content-wrap > div.footer-btns > div.btns > button.btn-l.btn-sure.ml16')
    await page.click('#tc-ie-base-content > div.tc-ie-base > div.base-content-wrap > div.footer-btns > div.btns > button.btn-l.btn-sure.ml16')
    page.click('#js-submit-0 > button')
  } else {
    await page.waitForSelector('#app > div > div.content > div > div.slogan-btns-wrapper > div.login-btn', 3000)
    await page.click('#app > div > div.content > div > div.slogan-btns-wrapper > div.login-btn')
    await page.waitForSelector('#sso_container > div.sso-qr > div.qr-content > div.qr-img > img', 3000)
    console.log('请扫描二维码登录,等待30秒')
    await page.waitForSelector('#app > div > div.m-menu > div.upload-btn', 30000)
    console.log('已登陆')
    cookies = await page.cookies()
    fs.writeFileSync(cookieName, JSON.stringify(cookies))
    page.close()
    browser.close()
    xigua()
  }
}
xigua('E:\\文档\\Videos\\youtube\\我如何训练猫.mp4', 'E:\\文档\\Downloads\\maxresdefault (5).webp', '我要测试以西能不能用')
