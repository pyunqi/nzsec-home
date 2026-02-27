'use strict';

const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const crypto      = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const router      = express.Router();

const CONTENT_PATH = path.join(__dirname, '../data/content.json');
const PAGES_PATH   = path.join(__dirname, '../data/pages.json');

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
}

function writeContent(data) {
  // Atomic write: write to temp file then rename
  const tmp = CONTENT_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, CONTENT_PATH);
}

function readPages() {
  return JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8'));
}

function writePages(data) {
  const tmp = PAGES_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, PAGES_PATH);
}

// Delete a page and all its descendants recursively
function deletePageAndDescendants(pages, id) {
  const children = pages.filter(p => p.parent === id);
  let remaining = pages.filter(p => p.id !== id);
  for (const child of children) {
    remaining = deletePageAndDescendants(remaining, child.id);
  }
  return remaining;
}

// GET /admin  — dashboard
router.get('/', requireAuth, (req, res) => {
  const content = readContent();
  const saved   = req.query.saved === '1';
  res.render('admin/dashboard', { content, saved });
});

// POST /admin/save
router.post('/save', requireAuth, (req, res) => {
  const b = req.body;

  // Helper to read a bilingual field from form body
  const bi = (enKey, zhKey) => ({ en: b[enKey] || '', zh: b[zhKey] || '' });

  // Rebuild stats array
  const statsCount = parseInt(b['about.stats.count'] || '0', 10);
  const stats = [];
  for (let i = 0; i < statsCount; i++) {
    stats.push({
      number: b[`about.stats[${i}].number`] || '',
      label: bi(`about.stats[${i}].label.en`, `about.stats[${i}].label.zh`)
    });
  }

  // Rebuild services items
  const svcCount = parseInt(b['services.items.count'] || '0', 10);
  const svcItems = [];
  for (let i = 0; i < svcCount; i++) {
    svcItems.push({
      icon:  b[`services.items[${i}].icon`] || '',
      title: bi(`services.items[${i}].title.en`, `services.items[${i}].title.zh`),
      body:  bi(`services.items[${i}].body.en`,  `services.items[${i}].body.zh`)
    });
  }

  // Rebuild whyUs items
  const whyCount = parseInt(b['whyUs.items.count'] || '0', 10);
  const whyItems = [];
  for (let i = 0; i < whyCount; i++) {
    whyItems.push({
      icon:  b[`whyUs.items[${i}].icon`] || '',
      title: bi(`whyUs.items[${i}].title.en`, `whyUs.items[${i}].title.zh`),
      body:  bi(`whyUs.items[${i}].body.en`,  `whyUs.items[${i}].body.zh`)
    });
  }

  const content = {
    hero: {
      location:     b['hero.location'] || '',
      title:        bi('hero.title.en',        'hero.title.zh'),
      subtitle:     bi('hero.subtitle.en',     'hero.subtitle.zh'),
      ctaPrimary:   bi('hero.ctaPrimary.en',   'hero.ctaPrimary.zh'),
      ctaSecondary: bi('hero.ctaSecondary.en', 'hero.ctaSecondary.zh')
    },
    about: {
      label: bi('about.label.en', 'about.label.zh'),
      title: bi('about.title.en', 'about.title.zh'),
      body1: bi('about.body1.en', 'about.body1.zh'),
      body2: bi('about.body2.en', 'about.body2.zh'),
      stats
    },
    services: {
      label: bi('services.label.en', 'services.label.zh'),
      title: bi('services.title.en', 'services.title.zh'),
      items: svcItems
    },
    whyUs: {
      label: bi('whyUs.label.en', 'whyUs.label.zh'),
      title: bi('whyUs.title.en', 'whyUs.title.zh'),
      items: whyItems
    },
    contact: {
      label:   bi('contact.label.en',   'contact.label.zh'),
      title:   bi('contact.title.en',   'contact.title.zh'),
      address: b['contact.address'] || '',
      email:   b['contact.email']   || '',
      phone:   b['contact.phone']   || '',
      wechat:  bi('contact.wechat.en', 'contact.wechat.zh'),
      form: {
        namePlaceholder:    bi('contact.form.namePlaceholder.en',    'contact.form.namePlaceholder.zh'),
        emailPlaceholder:   bi('contact.form.emailPlaceholder.en',   'contact.form.emailPlaceholder.zh'),
        messagePlaceholder: bi('contact.form.messagePlaceholder.en', 'contact.form.messagePlaceholder.zh'),
        selectDefault:      bi('contact.form.selectDefault.en',      'contact.form.selectDefault.zh'),
        submitBtn:          bi('contact.form.submitBtn.en',          'contact.form.submitBtn.zh'),
        successMsg:         bi('contact.form.successMsg.en',         'contact.form.successMsg.zh')
      }
    },
    footer: {
      tagline:   bi('footer.tagline.en',   'footer.tagline.zh'),
      copyright: bi('footer.copyright.en', 'footer.copyright.zh')
    }
  };

  writeContent(content);
  res.redirect('/admin?saved=1');
});

// ===== PAGE MANAGEMENT =====

// GET /admin/pages — page manager
router.get('/pages', requireAuth, (req, res) => {
  const { pages } = readPages();
  const editId = req.query.edit || null;
  const editPage = editId ? pages.find(p => p.id === editId) || null : null;
  const saved = req.query.saved === '1';
  res.render('admin/pages', { pages, editPage, saved });
});

// POST /admin/pages/create — create new page
router.post('/pages/create', requireAuth, (req, res) => {
  const { slug, titleEn, titleZh } = req.body;
  const data = readPages();
  const newPage = {
    id:        crypto.randomBytes(4).toString('hex'),
    slug:      (slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'page',
    title:     { en: titleEn || 'New Page', zh: titleZh || '新页面' },
    parent:    null,
    order:     data.pages.filter(p => p.parent === null).length,
    showInNav: false,
    content:   { en: '', zh: '' }
  };
  data.pages.push(newPage);
  writePages(data);
  res.redirect(`/admin/pages?edit=${newPage.id}`);
});

// POST /admin/pages/update — save page fields
router.post('/pages/update', requireAuth, (req, res) => {
  const { id, slug, titleEn, titleZh, parent, showInNav, contentEn, contentZh } = req.body;
  const data = readPages();
  const page = data.pages.find(p => p.id === id);
  if (page) {
    page.slug      = (slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || page.slug;
    page.title.en  = titleEn || '';
    page.title.zh  = titleZh || '';
    page.parent    = parent || null;
    page.showInNav = showInNav === 'on';
    page.content.en = contentEn || '';
    page.content.zh = contentZh || '';
    writePages(data);
  }
  res.redirect(`/admin/pages?edit=${id}&saved=1`);
});

// POST /admin/pages/delete — delete page and descendants
router.post('/pages/delete', requireAuth, (req, res) => {
  const { id } = req.body;
  const data = readPages();
  data.pages = deletePageAndDescendants(data.pages, id);
  writePages(data);
  res.redirect('/admin/pages');
});

// POST /admin/pages/reorder — move page up or down among siblings
router.post('/pages/reorder', requireAuth, (req, res) => {
  const { id, direction } = req.body;
  const data = readPages();
  const page = data.pages.find(p => p.id === id);
  if (page) {
    const siblings = data.pages
      .filter(p => p.parent === page.parent)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(p => p.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < siblings.length) {
      const tmp = siblings[idx].order;
      siblings[idx].order = siblings[swapIdx].order;
      siblings[swapIdx].order = tmp;
      // Normalise orders
      siblings.forEach((s, i) => { s.order = i; });
      writePages(data);
    }
  }
  const editParam = req.query.edit ? `?edit=${req.query.edit}` : '';
  res.redirect(`/admin/pages${editParam}`);
});

module.exports = router;
