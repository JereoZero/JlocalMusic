import { test, expect } from '@playwright/test'

test.describe('Jlocal App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该正确显示 Logo', async ({ page }) => {
    await expect(page.getByText('Only')).toBeVisible()
    await expect(page.getByText('0.6.5')).toBeVisible()
  })

  test('应该显示侧边栏导航', async ({ page }) => {
    await expect(page.getByText('我喜欢')).toBeVisible()
    await expect(page.getByText('本地')).toBeVisible()
    await expect(page.getByText('隐藏')).toBeVisible()
    await expect(page.getByText('设置')).toBeVisible()
  })

  test('点击导航应该切换视图', async ({ page }) => {
    await page.getByText('我喜欢').click()
    await expect(page.getByText('我喜欢的音乐')).toBeVisible()

    await page.getByText('本地').click()
    await expect(page.getByText('本地音乐')).toBeVisible()
  })

  test('应该显示播放器控制栏', async ({ page }) => {
    await expect(page.getByText('未在播放')).toBeVisible()
  })
})
