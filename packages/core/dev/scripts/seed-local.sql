-- =============================================================================
-- Local development seed data for Jant
-- Exported from local D1 database
-- Usage: mise run db-reset
-- =============================================================================

-- settings
INSERT INTO settings VALUES('ONBOARDING_STATUS','completed',1771819048);
INSERT INTO settings VALUES('HEADER_NAV_MAX_VISIBLE','2',1771933977);

-- user
INSERT INTO user VALUES('VwOJUz8upZa62jMLqPRzRe5a5aYoqIkr','Jant','theowenyoung@gmail.com',0,NULL,'admin',1771819048,1771819048);

-- account
INSERT INTO account VALUES('D62rjha0MSdLs1fF8SOGxkfFR5xsp2bq','VwOJUz8upZa62jMLqPRzRe5a5aYoqIkr','credential','VwOJUz8upZa62jMLqPRzRe5a5aYoqIkr',NULL,NULL,NULL,NULL,NULL,NULL,'c53714aaddb9857198e62cf75f59f498:d34f5bdf43ad9a244de9950edcae5aa9a1fe94fdcd65971e1f2bca21147d06b197bd087e4627da617f626858afeaaf82cb297cc0897fe45e68d12750c361d530',1771819048,1771819048);

-- pages
INSERT INTO pages VALUES(1,'about','About','Welcome to my corner of the internet.

This is a place where I share my thoughts, ideas, and things I find interesting. Feel free to look around and get to know what this site is all about.

If you''d like to get in touch, don''t hesitate to reach out.','<p>Welcome to my corner of the internet.</p>
<p>This is a place where I share my thoughts, ideas, and things I find interesting. Feel free to look around and get to know what this site is all about.</p>
<p>If you&#39;d like to get in touch, don&#39;t hesitate to reach out.</p>
','published',1771819048,1771819048);

-- posts (id, format, status, visibility, pinned, path, title, url, body, body_html, body_text, quote_text, summary, rating, reply_to_id, thread_id, deleted_at, published_at, created_at, updated_at)
INSERT INTO posts VALUES(1,'quote','published','public',0,NULL,NULL,NULL,NULL,NULL,NULL,'”判断”（Orient）是一切的支点。 判断不是简单的信息处理，而是一个由文化传统、过往经验、新信息的分析与综合、以及遗传因素共同塑造的复杂过滤器。你如何”看见”世界——你的心智模型——决定了你能观察到什么、如何决策、以及如何行动。',NULL,NULL,NULL,NULL,NULL,1771819095,1771819095,1771819095);
INSERT INTO posts VALUES(2,'note','published','public',0,NULL,NULL,NULL,'好的组织，是保护人“在乎”的本能。

没有人真的想交付自己都看不上的东西。我们天然就想把事情做得更对一点、更好一点。

问题在于这种原本强劲的驱动力，会被不好的组织慢慢消磨掉。当数字比价值更重要，“快点上线”比“做对”更重要。

一个好的组织要做的，其实就是：找到那些“在乎”的人，然后清理掉让“在乎”变成奢侈的障碍，让“在乎”重新成为组织的本能。

有了“在乎”，再加上手艺和品味，“对的东西”就会自然生长出来。','<p>好的组织，是保护人“在乎”的本能。</p>
<p>没有人真的想交付自己都看不上的东西。我们天然就想把事情做得更对一点、更好一点。</p>
<p>问题在于这种原本强劲的驱动力，会被不好的组织慢慢消磨掉。当数字比价值更重要，“快点上线”比“做对”更重要。</p>
<p>一个好的组织要做的，其实就是：找到那些“在乎”的人，然后清理掉让“在乎”变成奢侈的障碍，让“在乎”重新成为组织的本能。</p>
<p>有了“在乎”，再加上手艺和品味，“对的东西”就会自然生长出来。</p>
',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1771819104,1771819104,1771819104);
INSERT INTO posts VALUES(4,'note','published','public',0,NULL,'刷社交网络，阅读文章以及读书的区别是什么？',NULL,'之前我一直都在思考这个问题：为什么我明明在社交网络上也能学到不少东西，但为什么大家都说社交网络纯属浪费时间？那假如我在社交网络上关注的都是精心筛选过的用户，那么刷社交网络还是很浪费时间吗？

阅读文章比刷社交网络要好吗？

读书又比阅读文章要好吗？

最近在用[遛狗的时间](@/blog/reading-while-walking-dogs.md)读一本叫《打造第二大腦》的书，读完之后，我对此有了新的想法。

<!-- more -->

**首先，社交网络的确能刷出好东西**。 碎片化并不一定比长篇的文章或者图书低级，有的时候它可以是一句非常精辟的话。

那么为什么我们觉得看书的感觉更好呢？

因为碎片化的东西就算再精辟，那也只是很短的一段话，我们人脑更倾向于忘记这些简短，孤立的东西。所谓刷过就忘了。

读书不太一样的是，每本书都有一个非常明确的主题，作者会用非常长的篇幅，抽丝剥茧地为你剖析这个主题，所以我们读完之后，大概率印象会非常深刻，可以在脑子里保鲜很长时间。

阅读文章同理，它比碎片化的东西更具体，但是又比书简略的多，读完一篇文章之后，它在我们的脑子中保鲜的时间其实并不长。

但是如果把时间拉长，比如 10 年，再假设你阅读文章和看书从来不做笔记，或者笔记分散在各个不同的地方，那么这三者的区别就非常小了。对，即使你很喜欢看书，但是如果你没有写下来，在第二大脑里回顾，那么这些宝贵的素材基本就算是消失了。

所以重点是：**我们必须把我们在刷这些知识时筛选出来的材料记录下来**，这个记录的地方就是我们的第二大脑，它可以被方便的搜索，也可以被方便的浏览和新增笔记。

只有这些写下来的东西的才是我们的，其他的一切都会随着时间的消逝逐渐被遗忘。

所以仔细想一想，如果我在过去的 10 年都没有记下一些东西，那么这 10 年我是不是相当于白活了？因为所有的感受都会随着时间慢慢被冲淡，只有写下的东西，拍摄的照片才能代表我们的智识足迹。

## 结论

如果把时间拉长后，你会发现刷社交网络，阅读文章和读书 几乎一样了，所以这就是为什么我们把这些东西记下来，当作我们的第二大脑。

同时我也推荐你也看一下《打造第二大脑》这本书，参考书中的建议建立你的第二大脑。这样我们在刷社交网络，读文章，读书的时候，就可以把所有你觉得有需要记下来的东西，都保存在第二大脑中。

我的博客目前极大的充当了这个第二大脑，但是我的照片管理目前一团遭，我还在探索如何让照片保存，浏览，搜索流程上变得更流畅，等我探索出来之后，再写一篇文章分享我的经验～

> 由于我阅读的是用[沉浸式翻译](https://immersivetranslate.com/)制作的双语电子书，它的英文原文相对很简单，所以我可以在遛狗的时候只看原文，并且读出来，遇到不懂的原文，再看一下译文这样，所以进度很慢，截止目前进度差不多 57%，等我读完之后，我会重新规划一下我的第二大脑运行流程，同时，本博客绝对会是一个非常重要的地方。
','<p>之前我一直都在思考这个问题：为什么我明明在社交网络上也能学到不少东西，但为什么大家都说社交网络纯属浪费时间？那假如我在社交网络上关注的都是精心筛选过的用户，那么刷社交网络还是很浪费时间吗？</p>
<p>阅读文章比刷社交网络要好吗？</p>
<p>读书又比阅读文章要好吗？</p>
<p>最近在用<a href="@/blog/reading-while-walking-dogs.md">遛狗的时间</a>读一本叫《打造第二大腦》的书，读完之后，我对此有了新的想法。</p>
<!-- more -->

<p><strong>首先，社交网络的确能刷出好东西</strong>。 碎片化并不一定比长篇的文章或者图书低级，有的时候它可以是一句非常精辟的话。</p>
<p>那么为什么我们觉得看书的感觉更好呢？</p>
<p>因为碎片化的东西就算再精辟，那也只是很短的一段话，我们人脑更倾向于忘记这些简短，孤立的东西。所谓刷过就忘了。</p>
<p>读书不太一样的是，每本书都有一个非常明确的主题，作者会用非常长的篇幅，抽丝剥茧地为你剖析这个主题，所以我们读完之后，大概率印象会非常深刻，可以在脑子里保鲜很长时间。</p>
<p>阅读文章同理，它比碎片化的东西更具体，但是又比书简略的多，读完一篇文章之后，它在我们的脑子中保鲜的时间其实并不长。</p>
<p>但是如果把时间拉长，比如 10 年，再假设你阅读文章和看书从来不做笔记，或者笔记分散在各个不同的地方，那么这三者的区别就非常小了。对，即使你很喜欢看书，但是如果你没有写下来，在第二大脑里回顾，那么这些宝贵的素材基本就算是消失了。</p>
<p>所以重点是：<strong>我们必须把我们在刷这些知识时筛选出来的材料记录下来</strong>，这个记录的地方就是我们的第二大脑，它可以被方便的搜索，也可以被方便的浏览和新增笔记。</p>
<p>只有这些写下来的东西的才是我们的，其他的一切都会随着时间的消逝逐渐被遗忘。</p>
<p>所以仔细想一想，如果我在过去的 10 年都没有记下一些东西，那么这 10 年我是不是相当于白活了？因为所有的感受都会随着时间慢慢被冲淡，只有写下的东西，拍摄的照片才能代表我们的智识足迹。</p>
<h2>结论</h2>
<p>如果把时间拉长后，你会发现刷社交网络，阅读文章和读书 几乎一样了，所以这就是为什么我们把这些东西记下来，当作我们的第二大脑。</p>
<p>同时我也推荐你也看一下《打造第二大脑》这本书，参考书中的建议建立你的第二大脑。这样我们在刷社交网络，读文章，读书的时候，就可以把所有你觉得有需要记下来的东西，都保存在第二大脑中。</p>
<p>我的博客目前极大的充当了这个第二大脑，但是我的照片管理目前一团遭，我还在探索如何让照片保存，浏览，搜索流程上变得更流畅，等我探索出来之后，再写一篇文章分享我的经验～</p>
<blockquote>
<p>由于我阅读的是用<a href="https://immersivetranslate.com/">沉浸式翻译</a>制作的双语电子书，它的英文原文相对很简单，所以我可以在遛狗的时候只看原文，并且读出来，遇到不懂的原文，再看一下译文这样，所以进度很慢，截止目前进度差不多 57%，等我读完之后，我会重新规划一下我的第二大脑运行流程，同时，本博客绝对会是一个非常重要的地方。</p>
</blockquote>
',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1771820767,1771820767,1771820767);
INSERT INTO posts VALUES(5,'link','published','public',0,NULL,'List Chanllenges','https://www.listchallenges.com/','用户自制清单的聚合平台，涵盖电影/书籍/旅行/食物等几十种类别（超过 30 万份清单），每份清单可打勾标记「已完成」并统计完成率。典型用法是刷「看过多少部 1001 部必看电影」或「去过哪些国家」这类清单，适合喜欢用数字量化生活经历的人；但清单质量参差不齐，很多是个人流水账而非精选榜单。首页按 Trending/New/Popular 排序，更新活跃，无付费墙。

','<p>用户自制清单的聚合平台，涵盖电影/书籍/旅行/食物等几十种类别（超过 30 万份清单），每份清单可打勾标记「已完成」并统计完成率。典型用法是刷「看过多少部 1001 部必看电影」或「去过哪些国家」这类清单，适合喜欢用数字量化生活经历的人；但清单质量参差不齐，很多是个人流水账而非精选榜单。首页按 Trending/New/Popular 排序，更新活跃，无付费墙。</p>
',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1771820865,1771820865,1771820865);
INSERT INTO posts VALUES(6,'note','published','public',0,NULL,NULL,NULL,'一些图片:)','<p>一些图片:)</p>
',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1771838016,1771838016,1771838016);

-- nav_items
INSERT INTO nav_items VALUES(3,'page','About','/about',1,1,1771819048,1771935668);
INSERT INTO nav_items VALUES(4,'system','RSS','/feed',NULL,3,1771933096,1771935668);
INSERT INTO nav_items VALUES(5,'system','Dashboard','/dash',NULL,4,1771933098,1771935668);
INSERT INTO nav_items VALUES(7,'system','Archive','/archive',NULL,2,1771933104,1771935668);
INSERT INTO nav_items VALUES(8,'system','Collections','/c',NULL,0,1771935661,1771935668);

-- media
INSERT INTO media VALUES('019c89c6-516f-7eb4-9e53-bc6402b59355',6,'019c89c6-516f-7eb4-9e53-bc6402b59355.webp','leonardo-iribe-zG87D_xiAVQ-unsplash.webp','image/webp',75040,'media/2026/02/019c89c6-516f-7eb4-9e53-bc6402b59355.webp',NULL,NULL,NULL,1771838002,1,NULL,'r2',NULL,NULL,0);
INSERT INTO media VALUES('019c89c6-52c6-7ad4-956b-01583ab92216',6,'019c89c6-52c6-7ad4-956b-01583ab92216.webp','maeva-vigier-hdgHGw5EqIc-unsplash.webp','image/webp',384088,'media/2026/02/019c89c6-52c6-7ad4-956b-01583ab92216.webp',NULL,NULL,NULL,1771838002,2,NULL,'r2',NULL,NULL,0);
INSERT INTO media VALUES('019c89c6-5380-72f2-b462-06de1b9e3f81',6,'019c89c6-5380-72f2-b462-06de1b9e3f81.webp','land-o-lakes-inc-yPBP2u24rMs-unsplash.webp','image/webp',607962,'media/2026/02/019c89c6-5380-72f2-b462-06de1b9e3f81.webp',NULL,NULL,NULL,1771838003,0,NULL,'r2',NULL,NULL,0);
