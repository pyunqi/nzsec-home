'use strict';

const express     = require('express');
const crypto      = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const { readContent, writeContent, readPages, writePages } = require('../lib/db');
const router      = express.Router();

// Delete a page and all its descendants recursively
function deletePageAndDescendants(pages, id) {
  const children = pages.filter(p => p.parent === id);
  let remaining  = pages.filter(p => p.id !== id);
  for (const child of children) {
    remaining = deletePageAndDescendants(remaining, child.id);
  }
  return remaining;
}

// Sanitise a slug string
function sanitiseSlug(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET /admin — dashboard
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const content = await readContent();
    const saved   = req.query.saved === '1';
    res.render('admin/dashboard', { content, saved });
  } catch (err) { next(err); }
});

// POST /admin/save
router.post('/save', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const bi = (enKey, zhKey) => ({ en: b[enKey] || '', zh: b[zhKey] || '' });

    // Rebuild stats array
    const statsCount = parseInt(b['about.stats.count'] || '0', 10);
    const stats = [];
    for (let i = 0; i < statsCount; i++) {
      stats.push({
        number: b[`about.stats[${i}].number`] || '',
        label:  bi(`about.stats[${i}].label.en`, `about.stats[${i}].label.zh`)
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

    await writeContent(content);
    res.redirect('/admin?saved=1');
  } catch (err) { next(err); }
});

// ===== PAGE MANAGEMENT =====

// GET /admin/pages
router.get('/pages', requireAuth, async (req, res, next) => {
  try {
    const { pages } = await readPages();
    const editId   = req.query.edit || null;
    const editPage = editId ? pages.find(p => p.id === editId) || null : null;
    const saved    = req.query.saved === '1';
    res.render('admin/pages', { pages, editPage, saved });
  } catch (err) { next(err); }
});

// POST /admin/pages/create
router.post('/pages/create', requireAuth, async (req, res, next) => {
  try {
    const { slug, titleEn, titleZh } = req.body;
    const data = await readPages();
    const newPage = {
      id:        crypto.randomBytes(4).toString('hex'),
      slug:      sanitiseSlug(slug) || 'page',
      title:     { en: titleEn || 'New Page', zh: titleZh || '新页面' },
      parent:    null,
      order:     data.pages.filter(p => p.parent === null).length,
      showInNav: false,
      content:   { en: '', zh: '' }
    };
    data.pages.push(newPage);
    await writePages(data);
    res.redirect(`/admin/pages?edit=${newPage.id}`);
  } catch (err) { next(err); }
});

// POST /admin/pages/update
router.post('/pages/update', requireAuth, async (req, res, next) => {
  try {
    const { id, slug, titleEn, titleZh, parent, showInNav, contentEn, contentZh } = req.body;
    const data = await readPages();
    const page = data.pages.find(p => p.id === id);
    if (page) {
      page.slug       = sanitiseSlug(slug) || page.slug;
      page.title.en   = titleEn || '';
      page.title.zh   = titleZh || '';
      page.parent     = parent || null;
      page.showInNav  = showInNav === 'on';
      page.content.en = contentEn || '';
      page.content.zh = contentZh || '';
      await writePages(data);
    }
    res.redirect(`/admin/pages?edit=${id}&saved=1`);
  } catch (err) { next(err); }
});

// POST /admin/pages/delete
router.post('/pages/delete', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.body;
    const data = await readPages();
    data.pages = deletePageAndDescendants(data.pages, id);
    await writePages(data);
    res.redirect('/admin/pages');
  } catch (err) { next(err); }
});

// POST /admin/pages/reorder
router.post('/pages/reorder', requireAuth, async (req, res, next) => {
  try {
    const { id, direction } = req.body;
    const data = await readPages();
    const page = data.pages.find(p => p.id === id);
    if (page) {
      const siblings = data.pages
        .filter(p => p.parent === page.parent)
        .sort((a, b) => a.order - b.order);
      const idx     = siblings.findIndex(p => p.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < siblings.length) {
        const tmp           = siblings[idx].order;
        siblings[idx].order = siblings[swapIdx].order;
        siblings[swapIdx].order = tmp;
        siblings.forEach((s, i) => { s.order = i; });
        await writePages(data);
      }
    }
    const editParam = req.query.edit ? `?edit=${req.query.edit}` : '';
    res.redirect(`/admin/pages${editParam}`);
  } catch (err) { next(err); }
});

module.exports = router;
