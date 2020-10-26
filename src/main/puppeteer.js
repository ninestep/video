const puppeteer = require('puppeteer')
export async function get (url) {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url, {waitUntil: 'networkidle2'})
  await page.pdf({path: 'hn.pdf', format: 'A4'})

  await browser.close()
}
get('https://www.playm3u8.cn/jiexi.php?url=http://www.mgtv.com/b/344009/9914259.html')
