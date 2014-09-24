ALL_LINGUAS = @ALL_LINGUAS@

yelp.pot: yelp.xml.in yelp-endless.xml.in
	itstool -o "$@" $^

%.xml: %.xml.in
	$(AM_V_GEN) ( \
	$(MKDIR_P) $@-temp; \
	for lang in $(ALL_LINGUAS); do \
	  msgfmt -o "$@-temp/$$lang.mo" "$(top_srcdir)/po/$$lang.po" || exit 1; \
	done; \
	itstool -o "$@" -j "$^" $(foreach ll,$(ALL_LINGUAS),$@-temp/$(ll).mo); \
	rm $(foreach ll,$(ALL_LINGUAS),$@-temp/$(ll).mo); \
	rmdir $@-temp)

xsldir=$(datadir)/yelp-xsl/xslt/common/domains

xsl_DATA = yelp.xml yelp-endless.xml

EXTRA_DIST = yelp.xml.in yelp.xml yelp.pot yelp-endless.xml.in yelp-endless.xml
