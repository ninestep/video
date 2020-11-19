const puppeteer = require('puppeteer')
const fs = require('fs')

export function xigua (filePath, title = '', message = '', callback = function (event) { console.log(event) }) {
  return new Promise(async (resolve, reject) => {
    let msg = ''
    try {
      msg = '正在打开浏览器'
      callback(msg)
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      })
      const cookieName = 'xiGuaCookies'
      let cookies = []
      let login = false
      msg = '读取COOKIES'
      callback(msg)
      try {
        cookies = JSON.parse(fs.readFileSync(cookieName))
        login = true
      } catch (e) {
        msg = '读取COOKIES失败'
        callback(msg)
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
      msg = '跳转页面'
      callback(msg)
      await page.goto(url)
      try {
        await page.waitForSelector('#app > div > section > div > div > div > div.xigua-upload-video-empty > div:nth-child(1) > div > div.byte-upload.xigua-upload-video-trigger.upload-video-trigger-card > div', 3000)
      } catch (e) {
        login = false
      }
      if (login) {
        let uploadElement = await page.$('#app > div > section > div > div > div > div.xigua-upload-video-empty > div:nth-child(1) > div > div.byte-upload.xigua-upload-video-trigger.upload-video-trigger-card > input[type=file]')
        await uploadElement.uploadFile(filePath)
        msg = '等待输入信息'
        callback(msg)
        await page.waitForSelector('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-title > div.video-form-item-wrapper > div.video-form-item-control > div > div > input')
        let divHandle = await page.$('#app')
        await page.evaluate((el, value) => el.setAttribute('style', value),
          divHandle,
          ' overflow:auto'
        )
        msg = '输入信息'
        callback(msg)
        if (title !== '') {
          let titleElement = '#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-title > div.video-form-item-wrapper > div > div > div > input'
          await page.click(titleElement, {clickCount: 3})
          await page.keyboard.press('Backspace')
          await page.type(titleElement, title)
        }
        if (message !== '') {
          let messageElement = '#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-abstract > div.video-form-item-wrapper > div > div > textarea'
          await page.click(messageElement, {clickCount: 3})
          await page.keyboard.press('Backspace')
          await page.type(messageElement, message)
        }
        msg = '点击原创'
        callback(msg)
        await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-origin > div.video-form-item-wrapper > div > div > label:nth-child(1) > span > span')
        msg = '不同步抖音'
        callback(msg)
        let douyin = await page.$('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-dy > div.video-form-item-wrapper > div > div.m-settings > span.label')
        if (douyin) {
          await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-dy > div.video-form-item-wrapper > div > label > span > span')
        }
        msg = '等待视频上传成功'
        callback(msg)
        await page.waitForSelector('#js-video-list-content > div > div.video-upload-status > div.top > div.right > div.status', {timeout: 300000})
        msg = '视频上传成功'
        callback(msg)
        await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-poster > div.video-form-item-wrapper > div.video-form-item-control > div > div')
        // 封面
        await page.click('#js-video-list-content > div > div.video-from-container > div.video-form-item.form-item-poster > div.video-form-item-wrapper > div.video-form-item-control > div > div')
        while (true) {
          msg = '等待封面完成'
          callback(msg)
          try {
            await page.waitForSelector('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div:nth-child(2) > img')
          } catch (e) {
            let loading = await page.$('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > svg')
            let error = await page.$('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > div.btn-bg')
            if (!loading && !error) {
              msg = '封面获取失败，退出'
              callback(msg)
              reject(new Error('封面获取失败，退出'))
            }
            if (error) {
              msg = '检测到错误，重新获取'
              callback(msg)
              await page.click('body > div.Dialog-container > div > div.m-content > div > div.body.undefined > div > div > div > div.btn-bg')
            }
            if (loading) {
              msg = '正在获取，继续等待'
              callback(msg)
            }
          }
          break
        }
        msg = '选择封面'
        callback(msg)
        let [img] = await page.$x('/html/body/div[3]/div/div[2]/div/div[1]/div/div/div[1]/img')
        await img.click()
        msg = '点击封面'
        callback(msg)
        await page.click('body > div.Dialog-container > div > div.m-content > div > div.footer.undefined > div')
        msg = '点击下一步'
        callback(msg)
        msg = '等待下一步按钮'
        callback(msg)
        await page.waitForXPath('//*[@id="tc-ie-base-content"]/div[2]/div[2]/div[3]/div[3]/button[2][not(contains(@class,\'disabled\'))]')
        msg = '点击下一步按钮'
        callback(msg)
        await page.click('#tc-ie-base-content > div.tc-ie-base > div.base-content-wrap > div.footer-btns > div.btns > button.btn-l.btn-sure.ml16')
        msg = '等待确定按钮'
        callback(msg)
        await page.waitForSelector('body > div:nth-child(14) > div > div.m-content > div > div.footer.undefined > button.m-button.red.undefined')
        msg = '点击确定按钮'
        callback(msg)
        await page.click('body > div:nth-child(14) > div > div.m-content > div > div.footer.undefined > button.m-button.red.undefined')
        msg = '等待30秒调整'
        callback(msg)
        await page.waitFor(30000)
        msg = '等待提交按钮'
        callback(msg)
        await page.waitForSelector('#js-submit-0 > button')
        msg = '点击提交按钮'
        callback(msg)
        page.click('#js-submit-0 > button')
        await page.waitFor(3000)
        page.close()
        browser.close()
        resolve()
      } else {
        await page.waitForSelector('#app > div > div.content > div > div.slogan-btns-wrapper > div.login-btn', 3000)
        await page.click('#app > div > div.content > div > div.slogan-btns-wrapper > div.login-btn')
        await page.waitForSelector('#sso_container > div.sso-qr > div.qr-content > div.qr-img > img', 3000)
        msg = '请扫描二维码登录, 等待30秒'
        callback(msg)
        await page.waitForSelector('#app > div > div.m-menu > div.upload-btn', 30000)
        msg = '已登陆'
        callback(msg)
        cookies = await page.cookies()
        fs.writeFileSync(cookieName, JSON.stringify(cookies))
        page.close()
        browser.close()
        xigua()
      }
    } catch (e) {
      reject(e)
    }
  })
}
