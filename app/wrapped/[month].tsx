import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBg } from '@/components/gradient-bg';
import { C, gradeColor } from '@/constants/climbing';
import {
  cardsFor,
  shareText,
  wrappedForMonth,
  type MonthWrapped,
  type WrappedCard,
} from '@/constants/wrapped';
import { useClimbs } from '@/hooks/use-climbs';

/** Session dots stop being readable past a month's worth. */
const MAX_DOTS = 31;
/** More gyms than this and the bars get too thin to read. */
const MAX_GYM_ROWS = 6;

/**
 * The Nocturne cards were drawn against a 390x844 frame. Everything scales off
 * that so a taller phone gets bigger type instead of a taller void.
 */
type Scale = {
  s: number;
  mega: number;
  hero: number;
  big: number;
  grade: number;
  h2: number;
  h2Big: number;
  body: number;
  gap: number;
};

function useScale(): Scale {
  const { height } = useWindowDimensions();
  const s = Math.min(Math.max(height / 844, 0.9), 1.35);
  const r = (n: number) => Math.round(n * s);
  return {
    s,
    mega: r(96),
    hero: r(44),
    big: r(72),
    grade: r(68),
    h2: r(24),
    h2Big: r(26),
    body: Math.round(14 * Math.min(s, 1.15)),
    gap: r(12),
  };
}

export default function WrappedScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const { climbs } = useClimbs();
  const router = useRouter();
  const z = useScale();

  const wrapped = useMemo(() => wrappedForMonth(climbs, month), [climbs, month]);
  const cards = useMemo<WrappedCard[]>(() => (wrapped ? cardsFor(wrapped) : []), [wrapped]);
  const [i, setI] = useState(0);

  const close = () => router.back();

  if (!wrapped) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.topBar}>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>
        <Text style={styles.notFound}>Nothing logged for this month.</Text>
      </SafeAreaView>
    );
  }

  const idx = Math.min(i, cards.length - 1);
  const card = cards[idx];
  const isSummary = card === 'summary';

  const next = () => (idx < cards.length - 1 ? setI(idx + 1) : close());
  const prev = () => (idx > 0 ? setI(idx - 1) : close());

  const onShare = () => {
    Share.share({ message: shareText(wrapped) }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.segRow}>
        {cards.map((k, n) => (
          <View key={k} style={[styles.seg, { opacity: n <= idx ? 1 : 0.22 }]} />
        ))}
      </View>

      <View style={styles.topBar}>
        <Text style={styles.kickerMuted}>{wrapped.label} · Wrapped</Text>
        <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <CardBody card={card} m={wrapped} z={z} />

        {/* Tap zones sit above the card art; on the summary they stop short of
            the action row so its buttons stay reachable. */}
        <Pressable
          onPress={prev}
          style={[styles.tapZone, { left: 0, width: '30%', bottom: isSummary ? 76 : 0 }]}
        />
        <Pressable
          onPress={next}
          style={[styles.tapZone, { right: 0, width: '70%', bottom: isSummary ? 76 : 0 }]}
        />

        {isSummary && (
          <View style={styles.summaryActions}>
            <Pressable onPress={onShare} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Share this</Text>
            </Pressable>
            <Pressable onPress={close} style={[styles.btn, styles.btnSecondary]}>
              <Text style={styles.btnSecondaryText}>All months</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.footer}>
        {idx + 1} / {cards.length} — tap to keep going
      </Text>
    </SafeAreaView>
  );
}

/**
 * Shared card frame: kicker pinned top, body centred in whatever space is
 * left, footer pinned bottom. This is what keeps a thin month (one session,
 * one gym) from collapsing into the top third of a tall screen.
 */
function Card({
  kicker,
  footer,
  children,
  z,
  align = 'center',
}: {
  kicker?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  z: Scale;
  align?: 'center' | 'top';
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardInner, { paddingBottom: Math.round(26 * z.s) }]}>
        {!!kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <View
          style={[
            styles.cardMain,
            { gap: z.gap, justifyContent: align === 'center' ? 'center' : 'flex-start' },
          ]}>
          {children}
        </View>
        {!!footer && <View>{footer}</View>}
      </View>
    </View>
  );
}

function CardBody({ card, m, z }: { card: WrappedCard; m: MonthWrapped; z: Scale }) {
  switch (card) {
    case 'opener':
      return <Opener m={m} z={z} />;
    case 'sessions':
      return <Sessions m={m} z={z} />;
    case 'sends':
      return <Sends m={m} z={z} />;
    case 'split':
      return <Split m={m} z={z} />;
    case 'gyms':
      return <Gyms m={m} z={z} />;
    case 'setters':
      return <Setters m={m} z={z} />;
    case 'hardest':
      return <Hardest m={m} z={z} />;
    case 'summary':
      return <Summary m={m} z={z} />;
  }
}

function Opener({ m, z }: { m: MonthWrapped; z: Scale }) {
  return (
    <View style={styles.card}>
      <GradientBg from={C.section} to={C.bg} />
      <View style={[styles.openerInner, { paddingBottom: Math.round(26 * z.s), gap: z.gap + 2 }]}>
        <View style={styles.accentRule} />
        <Text style={[styles.hero, { fontSize: z.hero, lineHeight: Math.round(z.hero * 1.05) }]}>
          Your month{'\n'}on the wall.
        </Text>
        <Text style={[styles.lede, { fontSize: Math.round(z.body * 1.07) }]}>{m.openerLine}</Text>
        <View style={styles.hairline} />
        <View style={styles.statTriple}>
          <BigStat value={String(m.sends)} label="sends" z={z} />
          <BigStat value={String(m.sessions)} label="sessions" z={z} />
          <BigStat value={`${m.rate}%`} label="send rate" z={z} accent />
        </View>
      </View>
    </View>
  );
}

function Sessions({ m, z }: { m: MonthWrapped; z: Scale }) {
  const dots = Array.from({ length: Math.min(m.sessions, MAX_DOTS) });
  const dot = Math.round(16 * z.s);
  return (
    <Card
      kicker="Showing up"
      z={z}
      footer={
        <View style={styles.tagRow}>
          <Tag label={`${m.visits} gym visit${m.visits === 1 ? '' : 's'}`} />
          <Tag label={`${m.perWeek} per week`} outline />
        </View>
      }>
      <Text style={[styles.megaNumber, { fontSize: z.mega, lineHeight: Math.round(z.mega * 0.94) }]}>
        {m.sessions}
      </Text>
      <Text style={[styles.h2, { fontSize: z.h2 }]}>
        session{m.sessions === 1 ? '' : 's'} logged
      </Text>
      <View style={styles.dotWrap}>
        {dots.map((_, n) => (
          <View key={n} style={[styles.dot, { width: dot, height: dot }]} />
        ))}
      </View>
      <Text style={[styles.body, { fontSize: z.body }]}>{m.sessionLine}</Text>
    </Card>
  );
}

function Sends({ m, z }: { m: MonthWrapped; z: Scale }) {
  return (
    <Card
      kicker="Sends vs. tries"
      z={z}
      footer={
        <Text style={[styles.body, { fontSize: z.body }]}>
          Every burn you lost is a rep you kept. That is the whole trick.
        </Text>
      }>
      <Text style={[styles.h2Big, { fontSize: z.h2Big, lineHeight: Math.round(z.h2Big * 1.15) }]}>
        You stuck the top {m.rate}% of the time
      </Text>
      <View style={styles.sendsRow}>
        <Text style={[styles.bigNumber, { fontSize: z.big, lineHeight: Math.round(z.big * 0.97) }]}>
          {m.sends}
        </Text>
        <Text style={styles.bigNumberUnit}>sends</Text>
      </View>
      <View style={[styles.rateTrack, { height: Math.round(26 * z.s) }]}>
        <View style={[styles.rateFill, { width: `${Math.min(100, m.rate)}%` }]} />
      </View>
      <View style={styles.spread}>
        <Text style={styles.meta}>{m.tries} attempts</Text>
        <Text style={styles.meta}>{m.misses} that said no</Text>
      </View>
    </Card>
  );
}

function Split({ m, z }: { m: MonthWrapped; z: Scale }) {
  const max = Math.max(1, ...m.disciplines.map(d => d.sends));
  return (
    <Card kicker="How you climbed" z={z}>
      <Text style={[styles.h2Big, { fontSize: z.h2Big, lineHeight: Math.round(z.h2Big * 1.15) }]}>
        {m.splitLine}
      </Text>
      <View style={{ gap: Math.round(16 * z.s), marginTop: 6 }}>
        {m.disciplines.map(d => (
          <View key={d.key} style={{ gap: 5 }}>
            <View style={styles.spread}>
              <Text style={styles.rowName}>{d.key}</Text>
              <Text style={styles.meta}>hardest {d.hardest ?? '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.barTrack, { height: Math.round(14 * z.s) }]}>
                <View style={[styles.barFill, { width: `${(d.sends / max) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{d.sends}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Gyms({ m, z }: { m: MonthWrapped; z: Scale }) {
  const rows = m.gyms.slice(0, MAX_GYM_ROWS);
  const max = Math.max(1, ...rows.map(g => g.visits));
  return (
    <Card
      kicker="Where you were"
      z={z}
      footer={
        <View style={styles.tagRow}>
          <Tag label={`${m.gymCount} gym${m.gymCount === 1 ? '' : 's'}`} />
          <Tag label={`${m.visits} visit${m.visits === 1 ? '' : 's'} total`} outline />
        </View>
      }>
      {!!m.topGym && (
        <View style={styles.panel}>
          <Text style={styles.panelKicker}>Home wall</Text>
          <Text style={[styles.panelTitle, { fontSize: Math.round(22 * z.s) }]}>
            {m.topGym.name}
          </Text>
          <Text style={styles.panelAccent}>
            {m.topGym.visits} visit{m.topGym.visits === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      {!!m.leastGym && (
        <View style={styles.panelDashed}>
          <Text style={styles.panelKickerDim}>Least visited</Text>
          <Text style={styles.panelTitleSm}>{m.leastGym.name}</Text>
          <Text style={styles.meta}>
            {m.leastGym.visits} visit{m.leastGym.visits === 1 ? '' : 's'} — it misses you
          </Text>
        </View>
      )}

      {/* Only worth drawing the comparison bars when there's more than one gym. */}
      {rows.length > 1 && (
        <View style={{ gap: 7, marginTop: 2 }}>
          {rows.map(g => (
            <View key={g.name} style={styles.gymRow}>
              <Text style={styles.gymName} numberOfLines={1}>
                {g.name}
              </Text>
              <View style={styles.gymTrack}>
                <View style={[styles.gymFill, { width: `${(g.visits / max) * 100}%` }]} />
              </View>
              <Text style={styles.gymCount}>{g.visits}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function Setters({ m, z }: { m: MonthWrapped; z: Scale }) {
  const av = Math.round(48 * z.s);
  return (
    <Card
      kicker="Setters you tagged"
      z={z}
      footer={<Text style={styles.metaBody}>{m.setterNote}</Text>}>
      <Text style={[styles.h2Big, { fontSize: z.h2Big, lineHeight: Math.round(z.h2Big * 1.15) }]}>
        {m.setterHeadline}
      </Text>

      {!!m.setMost && (
        <View style={styles.setterCard}>
          <View style={[styles.avatar, { width: av, height: av }]}>
            <Text style={styles.avatarText}>{initials(m.setMost.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.panelKicker}>Most sent</Text>
            <Text style={styles.setterName} numberOfLines={1}>
              {m.setMost.name}
            </Text>
            <Text style={styles.meta}>
              {m.setMost.sends} send{m.setMost.sends === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      )}

      {!!m.setLeast && (
        <View style={styles.setterCardDim}>
          <View style={[styles.avatarDim, { width: av, height: av }]}>
            <Text style={styles.avatarTextDim}>{initials(m.setLeast.name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.panelKickerDim}>Least sent</Text>
            <Text style={styles.setterNameSm} numberOfLines={1}>
              {m.setLeast.name}
            </Text>
            <Text style={styles.meta}>
              {m.setLeast.sends} send{m.setLeast.sends === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

function Hardest({ m, z }: { m: MonthWrapped; z: Scale }) {
  const max = Math.max(1, ...m.grades.map(g => g.n));
  const headline = m.hardBoulder ?? m.hardRoute ?? '—';
  const second = m.hardBoulder ? m.hardLead ?? m.hardTopRope ?? m.hardRoute : null;
  const secondLabel = m.hardLead
    ? 'hardest lead'
    : m.hardTopRope
      ? 'hardest top rope'
      : 'hardest route';

  return (
    <Card
      kicker="Your ceiling moved"
      z={z}
      footer={
        m.grades.length > 0 ? (
          <View style={[styles.gradeChart, { height: Math.round(150 * z.s) }]}>
            {m.grades.map(g => (
              <View key={g.grade} style={styles.gradeCol}>
                <Text style={styles.meta}>{g.n}</Text>
                <View
                  style={[
                    styles.gradeBar,
                    {
                      height: `${Math.max(4, (g.n / max) * 100)}%`,
                      backgroundColor: gradeColor(g.grade),
                    },
                  ]}
                />
                <Text style={styles.gradeLabel}>{g.grade}</Text>
              </View>
            ))}
          </View>
        ) : null
      }>
      <View style={styles.hardestRow}>
        <Text
          style={[
            styles.megaGrade,
            { color: gradeColor(headline), fontSize: z.grade, lineHeight: Math.round(z.grade * 1.1) },
          ]}>
          {headline}
        </Text>
        {!!second && (
          <View style={{ paddingBottom: Math.round(10 * z.s) }}>
            <Text style={[styles.secondGrade, { color: gradeColor(second) }]}>{second}</Text>
            <Text style={styles.microLabel}>{secondLabel}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.body, { fontSize: z.body }]}>{m.progressLine}</Text>
    </Card>
  );
}

function Summary({ m, z }: { m: MonthWrapped; z: Scale }) {
  const rows: { label: string; value: string }[] = [];
  if (m.boulderSends) rows.push({ label: 'Boulders', value: `${m.boulderSends} · hardest ${m.hardBoulder ?? '—'}` });
  if (m.topRopeSends) rows.push({ label: 'Top rope', value: `${m.topRopeSends} · hardest ${m.hardTopRope ?? '—'}` });
  if (m.leadSends) rows.push({ label: 'Lead', value: `${m.leadSends} · hardest ${m.hardLead ?? '—'}` });
  if (m.gymCount) rows.push({ label: 'Gyms · visits', value: `${m.gymCount} · ${m.visits}` });
  if (m.topGym) rows.push({ label: 'Home wall', value: m.topGym.name });
  if (m.setMost) rows.push({ label: 'Most sent setter', value: `${m.setMost.name} · ${m.setMost.sends}` });
  if (m.setLeast) rows.push({ label: 'Least sent setter', value: `${m.setLeast.name} · ${m.setLeast.sends}` });

  return (
    <View style={styles.summaryOuter}>
      <View style={styles.summaryCard}>
        <GradientBg from={C.section} to={C.surface} stop={0.72} />
        <View style={styles.summaryInner}>
          <View style={styles.spread}>
            <Text style={styles.summaryTitle}>{m.label}</Text>
            <Text style={styles.kicker}>Crux wrapped</Text>
          </View>

          <View style={styles.grid}>
            <GridCell value={String(m.sends)} label="sends" z={z} />
            <GridCell value={String(m.tries)} label="attempts" z={z} />
            <GridCell value={String(m.sessions)} label="sessions" z={z} />
            <GridCell value={`${m.rate}%`} label="send rate" z={z} accent />
          </View>

          {/* Spread the detail rows through whatever height is left rather than
              stacking them tight under the grid. */}
          <View style={styles.summaryRows}>
            {rows.map(r => (
              <View key={r.label} style={styles.spread}>
                <Text style={styles.summaryRowLabel}>{r.label}</Text>
                <Text style={styles.summaryRowValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Bits ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

function BigStat({
  value,
  label,
  z,
  accent,
}: {
  value: string;
  label: string;
  z: Scale;
  accent?: boolean;
}) {
  return (
    <View>
      <Text
        style={[
          styles.tripleValue,
          { fontSize: Math.round(26 * z.s) },
          accent && { color: C.accentBright },
        ]}>
        {value}
      </Text>
      <Text style={styles.microLabel}>{label}</Text>
    </View>
  );
}

function GridCell({
  value,
  label,
  z,
  accent,
}: {
  value: string;
  label: string;
  z: Scale;
  accent?: boolean;
}) {
  return (
    <View style={styles.gridCell}>
      <Text
        style={[
          styles.gridValue,
          { fontSize: Math.round(28 * z.s) },
          accent && { color: C.accentBright },
        ]}>
        {value}
      </Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </View>
  );
}

function Tag({ label, outline }: { label: string; outline?: boolean }) {
  return <Text style={[styles.tag, outline ? styles.tagOutline : styles.tagNeutral]}>{label}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  segRow: { flexDirection: 'row', gap: 3, paddingHorizontal: 18, paddingTop: 8 },
  seg: { flex: 1, height: 2, borderRadius: 2, backgroundColor: C.accent },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: { color: C.text, fontSize: 20, lineHeight: 22 },
  notFound: { color: C.textMuted, textAlign: 'center', marginTop: 60 },

  stage: { flex: 1, position: 'relative', minHeight: 0 },
  tapZone: { position: 'absolute', top: 0 },

  card: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  cardInner: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  cardMain: { flex: 1 },

  // Opener
  openerInner: { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-end' },
  accentRule: { width: 34, height: 3, borderRadius: 2, backgroundColor: C.accent },
  hero: { fontWeight: '600', color: C.text, letterSpacing: -1 },
  lede: { color: C.textSec, lineHeight: 22, maxWidth: 320 },
  hairline: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  statTriple: { flexDirection: 'row', gap: 26 },
  tripleValue: { fontWeight: '600', color: C.text },

  // Shared type
  kicker: {
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: C.accentBright,
    fontWeight: '600',
  },
  kickerMuted: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: C.textSec },
  microLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.textSec,
    marginTop: 2,
  },
  h2: { fontWeight: '600', color: C.text, letterSpacing: -0.5 },
  h2Big: { fontWeight: '600', color: C.text, letterSpacing: -0.5, maxWidth: 320 },
  body: { color: C.textSec, lineHeight: 21 },
  metaBody: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
  meta: { fontSize: 12, color: C.textSec },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '600', color: C.text },

  // Sessions
  megaNumber: { fontWeight: '700', color: C.text, letterSpacing: -4 },
  dotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, maxWidth: 300 },
  dot: {
    borderRadius: 4,
    backgroundColor: C.accentDeep,
    borderWidth: 1,
    borderColor: '#796cbf',
  },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  tagNeutral: { backgroundColor: C.border, color: C.text },
  tagOutline: { borderWidth: 1, borderColor: C.accent, color: C.accent },

  // Sends
  sendsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  bigNumber: { fontWeight: '700', color: C.text, letterSpacing: -3 },
  bigNumberUnit: { fontSize: 13, color: C.textSec, paddingBottom: 12 },
  rateTrack: { borderRadius: 8, backgroundColor: C.border, overflow: 'hidden' },
  rateFill: { height: '100%', borderRadius: 8, backgroundColor: C.accent },

  // Split
  barTrack: { flex: 1, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: C.accent },
  barValue: { fontSize: 19, fontWeight: '600', color: C.text, minWidth: 40, textAlign: 'right' },

  // Gyms
  panel: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
  },
  panelDashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#595d6c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  panelKicker: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.textSec },
  panelKickerDim: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.textMuted },
  panelTitle: { fontWeight: '600', color: C.text, marginTop: 3 },
  panelTitleSm: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 2 },
  panelAccent: { fontSize: 13, color: C.accentBright, marginTop: 2 },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  gymName: { fontSize: 12, width: 120, color: C.text },
  gymTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  gymFill: { height: '100%', borderRadius: 4, backgroundColor: '#968ae0' },
  gymCount: { fontSize: 12, width: 18, textAlign: 'right', color: C.textSec },

  // Setters
  setterCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accentDeep,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  setterCardDim: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDim: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#595d6c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '600', color: '#e7e5fe' },
  avatarTextDim: { fontSize: 15, fontWeight: '600', color: C.textSec },
  setterName: { fontSize: 22, fontWeight: '600', color: C.text, lineHeight: 26 },
  setterNameSm: { fontSize: 18, fontWeight: '600', color: C.text, lineHeight: 22 },

  // Hardest
  hardestRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  megaGrade: { fontWeight: '700', fontFamily: 'monospace', letterSpacing: -2 },
  secondGrade: { fontSize: 26, fontWeight: '600', fontFamily: 'monospace', lineHeight: 28 },
  gradeChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  gradeCol: { flex: 1, alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' },
  gradeBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9 },
  gradeLabel: { fontSize: 12, fontWeight: '600', color: C.text, fontFamily: 'monospace' },

  // Summary
  summaryOuter: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  summaryInner: { flex: 1, paddingHorizontal: 16, paddingVertical: 18, gap: 14 },
  summaryTitle: { fontSize: 22, fontWeight: '600', color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(243,245,254,0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  gridValue: { fontWeight: '600', color: C.text },
  gridLabel: { fontSize: 11, color: C.textSec },
  summaryRows: { flex: 1, justifyContent: 'space-evenly', paddingBottom: 46 },
  summaryRowLabel: { fontSize: 13, color: C.textSec },
  summaryRowValue: { fontSize: 13, color: C.text },
  summaryActions: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 38,
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { flex: 1, borderColor: C.accent, backgroundColor: C.accentDim },
  btnPrimaryText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  btnSecondary: { borderColor: C.border },
  btnSecondaryText: { color: C.text, fontSize: 14, fontWeight: '600' },

  footer: {
    height: 38,
    textAlign: 'center',
    lineHeight: 38,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: C.textMuted,
  },
});
