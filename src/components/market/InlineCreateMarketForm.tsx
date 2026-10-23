import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@sudobility/components';
import { AnimatedCollapse } from '../../components/ui/AnimatedCollapse';
import { DealerNFTSelector } from '../../components/dealer/DealerNFTSelector';
import { useAuth } from '../../context/WalletAuthContext';
import { useIndexer } from '../../context/IndexerContext';
import { useCreateMarketWithToast } from '../../hooks';
import { useDealerPermission } from '../../hooks/useDealerPermission';
import { encodeOracleId } from '../../utils/oracleId';
import {
  ConditionType,
  encodeConditionData,
  formatConditionDescription,
} from '../../utils/conditionData';
import { ui } from '@sudobility/design';
import { getNow, toChainDate } from '../../utils/datetime';
import { CATEGORIES } from '../../types/market';
import type { SportCode } from '../../config/sportCodes';
import { useHeavymathUiText } from '../HeavymathUiTextProvider';

type MarketType = 'winloss' | 'matchscore';
type WinLossOutcome = 'win' | 'win_or_draw' | 'draw_or_lose';

interface InlineCreateMarketFormProps {
  sportCode: SportCode;
  gameId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: number;
  awayTeamId?: number;
  gameDate: Date;
  leagueName?: string;
  variant?: 'team-sport' | 'individual-sport' | 'race';
  onPollingChange?: (polling: boolean) => void;
  gameStarted?: boolean;
}

const OUTCOME_LABEL_KEYS: Record<WinLossOutcome, string> = {
  win: 'inlineCreateMarket.wins',
  win_or_draw: 'inlineCreateMarket.winsOrDraws',
  draw_or_lose: 'inlineCreateMarket.drawsOrLoses',
};

export function InlineCreateMarketForm({
  sportCode,
  gameId,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  gameDate,
  leagueName,
  variant = 'team-sport',
  onPollingChange,
  gameStarted = false,
}: InlineCreateMarketFormProps) {
  const text = useHeavymathUiText();
  const queryClient = useQueryClient();
  const { isDealer, dealerTokenIds } = useAuth();
  const { indexerClient } = useIndexer();
  const createMarket = useCreateMarketWithToast();

  const [selectedTokenId, setSelectedTokenId] = useState<bigint | undefined>(
    dealerTokenIds?.[0]
  );
  // Sync when dealerTokenIds loads asynchronously after mount
  useEffect(() => {
    if (
      selectedTokenId === undefined &&
      dealerTokenIds &&
      dealerTokenIds.length > 0
    ) {
    }
  }, [dealerTokenIds, selectedTokenId]);

  const { hasPermission, isLoading: isPermissionLoading } = useDealerPermission(
    sportCode,
    selectedTokenId
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(gameDate);
    return d.toISOString().slice(0, 16); // datetime-local format
  });

  // Condition type state
  const [marketType, setMarketType] = useState<MarketType>('winloss');
  const [positiveTeamSide, setPositiveTeamSide] = useState<'home' | 'away'>(
    'home'
  );
  const [winLossOutcome, setWinLossOutcome] = useState<WinLossOutcome>('win');
  const [scoreType, setScoreType] = useState('0');
  const scoreSide = positiveTeamSide === 'home' ? '0' : '1';
  const [scoreOperator, setScoreOperator] = useState('0');
  const [scoreExpectation, setScoreExpectation] = useState('0');
  const now = getNow();

  // User-editable title/description, auto-populated from form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  // Derive auto title and description from current form state
  const teamName = positiveTeamSide === 'home' ? homeTeamName : awayTeamName;
  const otherTeamName =
    positiveTeamSide === 'home' ? awayTeamName : homeTeamName;
  const shortDateStr = gameDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dateStr = gameDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const leagueStr = leagueName ? ` - ${leagueName}` : '';

  const autoTitle = (() => {
    if (variant === 'race')
      return text('inlineCreateMarket.titleOnDate', {
        team: homeTeamName,
        date: shortDateStr,
      });
    if (marketType === 'winloss') {
      const outcome = text(OUTCOME_LABEL_KEYS[winLossOutcome]);
      return text('inlineCreateMarket.titleWinloss', {
        team: teamName,
        outcome,
        other: otherTeamName,
        date: shortDateStr,
      });
    }
    const side = scoreSide === '0' ? homeTeamName : awayTeamName;
    const otherSide = scoreSide === '0' ? awayTeamName : homeTeamName;
    const val = scoreExpectation || '0';
    const isRelative = scoreType === '1';
    const op = Number(scoreOperator);
    const phraseKeys = isRelative
      ? [
          'inlineCreateMarket.winsByAtLeast',
          'inlineCreateMarket.winsByMoreThan',
          'inlineCreateMarket.winsByExactly',
          'inlineCreateMarket.winsByFewerThan',
          'inlineCreateMarket.winsByAtMost',
          'inlineCreateMarket.doesNotWinBy',
        ]
      : [
          'inlineCreateMarket.scoresAtLeast',
          'inlineCreateMarket.scoresMoreThan',
          'inlineCreateMarket.scoresExactly',
          'inlineCreateMarket.scoresFewerThan',
          'inlineCreateMarket.scoresAtMost',
          'inlineCreateMarket.doesNotScore',
        ];
    const phrase = text(phraseKeys[op] ?? phraseKeys[0], { val });
    return text('inlineCreateMarket.titleScore', {
      team: side,
      phrase,
      other: otherSide,
      date: shortDateStr,
    });
  })();

  const autoDescription = (() => {
    if (variant === 'race')
      return text('inlineCreateMarket.descriptionSingle', {
        team: homeTeamName,
        league: leagueStr,
        date: dateStr,
      });
    return text('inlineCreateMarket.descriptionVs', {
      home: homeTeamName,
      away: awayTeamName,
      league: leagueStr,
      date: dateStr,
    });
  })();

  const effectiveTitle = titleTouched && title ? title : autoTitle;
  const effectiveDescription =
    descriptionTouched && description ? description : autoDescription;

  // Poll indexer after market creation until a new market appears
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const prevMarketCountRef = useRef(0);
  const prevMarketIdsRef = useRef<Set<string>>(new Set());
  // Pending oracle config to save when the new market is found
  const pendingOracleConfigRef = useRef<{
    positiveTeamId: string;
    positiveTeamName: string;
    negativeTeamName: string;
  } | null>(null);

  const startPolling = () => {
    stopPolling();
    pollCountRef.current = 0;
    onPollingChange?.(true);
    // Snapshot current market IDs before polling
    const cached = queryClient.getQueryData<{ id: string }[]>([
      'gameMarkets',
      sportCode,
      gameId,
    ]);
    const cachedArr = Array.isArray(cached) ? cached : [];
    prevMarketCountRef.current = cachedArr.length;
    prevMarketIdsRef.current = new Set(cachedArr.map(m => m.id));

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      await queryClient.invalidateQueries({
        queryKey: ['gameMarkets', sportCode, gameId],
      });
      const updated = queryClient.getQueryData<{ id: string }[]>([
        'gameMarkets',
        sportCode,
        gameId,
      ]);
      const updatedArr = Array.isArray(updated) ? updated : [];
      const newCount = updatedArr.length;

      if (newCount > prevMarketCountRef.current) {
        // Find the new market ID and save oracle config if needed
        const newMarket = updatedArr.find(
          m => !prevMarketIdsRef.current.has(m.id)
        );
        if (newMarket && pendingOracleConfigRef.current && indexerClient) {
          try {
            await indexerClient.setMarketOracleConfig(
              newMarket.id,
              pendingOracleConfigRef.current
            );
          } catch (e) {
            console.error('Failed to save oracle config:', e);
          }
          pendingOracleConfigRef.current = null;
        }
        stopPolling();
      } else if (pollCountRef.current >= 20) {
        pendingOracleConfigRef.current = null;
        stopPolling();
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      onPollingChange?.(false);
    }
  };

  useEffect(() => stopPolling, []);

  if (!isDealer || gameStarted) return null;

  const tokenId = selectedTokenId;
  if (tokenId === undefined) return null;

  const deadlineDate = new Date(deadline);
  const minDeadlineMs = 24 * 60 * 60 * 1000; // 24 hours
  const isDeadlineValid =
    deadlineDate.getTime() - now.getTime() >= minDeadlineMs;
  const canSubmit = isDeadlineValid && !createMarket.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const oracleId = encodeOracleId(sportCode, gameId);
    const chainDeadline = toChainDate(deadlineDate);
    const deadlineBigInt = BigInt(Math.floor(chainDeadline.getTime() / 1000));

    // Build conditionData based on market type
    let conditionData: `0x${string}` | undefined;
    const selectedTeamId =
      positiveTeamSide === 'home' ? homeTeamId : awayTeamId;
    if (marketType === 'winloss' && selectedTeamId) {
      conditionData = encodeConditionData({
        type: ConditionType.WinLoss,
        positiveTeamId: selectedTeamId,
      }) as `0x${string}`;
    } else if (marketType === 'matchscore') {
      conditionData = encodeConditionData({
        type: ConditionType.MatchScore,
        scoreType: Number(scoreType) as 0 | 1,
        team: Number(scoreSide) as 0 | 1,
        operator: Number(scoreOperator) as 0 | 1 | 2 | 3 | 4 | 5,
        expectation: Number(scoreExpectation),
      }) as `0x${string}`;
    }
    await createMarket.mutateAsync({
      tokenId: BigInt(tokenId),
      category: BigInt(CATEGORIES.SPORTS),
      subCategory: BigInt(sportCode),
      deadline: deadlineBigInt,
      description: `${effectiveTitle}\n${effectiveDescription}`,
      oracleId,
      conditionData,
    });

    // Store oracle config to save once the market appears in the indexer
    pendingOracleConfigRef.current = {
      positiveTeamId: selectedTeamId ? String(selectedTeamId) : '',
      positiveTeamName: teamName,
      negativeTeamName: otherTeamName,
    };

    // Start polling for the new market to appear
    startPolling();
    setIsExpanded(false);
  };

  if (!isPermissionLoading && !hasPermission) {
    return (
      <div className='rounded-lg border border-dashed border-warning/40 bg-warning/5 p-4'>
        <p className='text-sm text-warning'>{text('dealer.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className='rounded-lg border border-dashed border-primary/40 bg-primary/5'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full flex items-center justify-between p-4 text-left'
      >
        <div className='flex items-center gap-2'>
          <span className='text-lg font-semibold text-primary'>+</span>
          <span className='font-medium'>{text('markets.createMarket')}</span>
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>

      <AnimatedCollapse open={isExpanded}>
        <div className='px-4 pb-4 space-y-3'>
          {/* Row 1: NFT Selector, Team, Type, condition-specific fields, .... Deadline */}
          <div className='flex flex-col md:flex-row md:items-end gap-3'>
            <DealerNFTSelector
              tokenIds={dealerTokenIds}
              selectedTokenId={selectedTokenId}
              onSelect={setSelectedTokenId}
            />
            {variant === 'team-sport' && (
              <div className='md:w-44'>
                <label className='block text-sm font-medium mb-1'>
                  {text('markets.positiveTeam')}
                </label>
                <Select
                  value={positiveTeamSide}
                  onValueChange={val =>
                    setPositiveTeamSide(val as 'home' | 'away')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='home'>{homeTeamName}</SelectItem>
                    <SelectItem value='away'>{awayTeamName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className='md:w-36'>
              <label className='block text-sm font-medium mb-1'>
                {text('market.condition.conditionType')}
              </label>
              <Select
                value={marketType}
                onValueChange={val => setMarketType(val as MarketType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='winloss'>
                    {text('market.condition.winLoss')}
                  </SelectItem>
                  <SelectItem value='matchscore'>
                    {text('market.condition.matchScore')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Win/Loss: Outcome */}
            {marketType === 'winloss' && (
              <div className='md:w-36'>
                <label className='block text-xs font-medium mb-1'>
                  {text('market.condition.outcome')}
                </label>
                <Select
                  value={winLossOutcome}
                  onValueChange={val =>
                    setWinLossOutcome(val as WinLossOutcome)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='win'>
                      {text('market.condition.win')}
                    </SelectItem>
                    <SelectItem value='win_or_draw'>
                      {text('market.condition.winOrDraw')}
                    </SelectItem>
                    <SelectItem value='draw_or_lose'>
                      {text('market.condition.drawOrLose')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Match Score: Score Type, Operator, Value */}
            {marketType === 'matchscore' && (
              <>
                <div className='md:w-28'>
                  <label className='block text-xs font-medium mb-1'>
                    {text('market.condition.scoreType')}
                  </label>
                  <Select value={scoreType} onValueChange={setScoreType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='0'>
                        {text('market.condition.absolute')}
                      </SelectItem>
                      <SelectItem value='1'>
                        {text('market.condition.relative')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='md:w-24'>
                  <label className='block text-xs font-medium mb-1'>
                    {text('market.condition.operator')}
                  </label>
                  <Select
                    value={scoreOperator}
                    onValueChange={setScoreOperator}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='0'>{'>='}</SelectItem>
                      <SelectItem value='1'>{'>'}</SelectItem>
                      <SelectItem value='2'>=</SelectItem>
                      <SelectItem value='3'>{'<'}</SelectItem>
                      <SelectItem value='4'>{'<='}</SelectItem>
                      <SelectItem value='5'>!=</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='md:w-20'>
                  <label className='block text-xs font-medium mb-1'>
                    {text('market.condition.value')}
                  </label>
                  <input
                    type='number'
                    value={scoreExpectation}
                    onChange={e => setScoreExpectation(e.target.value)}
                    placeholder='3'
                    className={`w-full px-3 py-2 rounded-lg border border-input ${ui.background.surface} text-sm`}
                  />
                </div>
              </>
            )}
            <div className='flex-1' />
            <div className='md:w-52'>
              <label className='block text-sm font-medium mb-1'>
                {text('markets.deadline')}
              </label>
              <input
                type='datetime-local'
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border border-input ${ui.background.surface} text-sm`}
              />
              {deadline && !isDeadlineValid && (
                <p className='mt-1 text-xs text-destructive'>
                  {text('markets.deadlineMinimum')}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Title, Description (editable, auto-populated) */}
          <div className='flex flex-col md:flex-row gap-3'>
            <div className='flex-1 min-w-0'>
              <label className='block text-sm font-medium mb-1'>
                {text('markets.title')}
              </label>
              <input
                type='text'
                value={titleTouched ? title : autoTitle}
                onChange={e => {
                  setTitleTouched(true);
                  setTitle(e.target.value);
                }}
                onFocus={() => {
                  if (!titleTouched) {
                    setTitle(autoTitle);
                    setTitleTouched(true);
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg border border-input ${ui.background.surface} text-sm`}
              />
            </div>
            <div className='flex-1 min-w-0'>
              <label className='block text-sm font-medium mb-1'>
                {text('markets.description')}
              </label>
              <input
                type='text'
                value={descriptionTouched ? description : autoDescription}
                onChange={e => {
                  setDescriptionTouched(true);
                  setDescription(e.target.value);
                }}
                onFocus={() => {
                  if (!descriptionTouched) {
                    setDescription(autoDescription);
                    setDescriptionTouched(true);
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg border border-input ${ui.background.surface} text-sm`}
              />
            </div>
          </div>

          {/* Row 3: Condition preview (left) + Create (right) */}
          <div className='flex flex-col md:flex-row md:items-center gap-3'>
            <div className='flex-1 min-w-0'>
              <div
                className={`p-2.5 rounded-lg ${ui.background.muted}/50 text-sm`}
              >
                <span className='text-muted-foreground'>
                  {text('inlineCreateMarket.condition')}{' '}
                </span>
                <span className='font-medium'>
                  {marketType === 'winloss'
                    ? `${positiveTeamSide === 'home' ? homeTeamName : awayTeamName} ${text(OUTCOME_LABEL_KEYS[winLossOutcome])}`
                    : formatConditionDescription(
                        {
                          type: ConditionType.MatchScore,
                          scoreType: Number(scoreType) as 0 | 1,
                          team: Number(scoreSide) as 0 | 1,
                          operator: Number(scoreOperator) as
                            0 | 1 | 2 | 3 | 4 | 5,
                          expectation: Number(scoreExpectation),
                        },
                        { home: homeTeamName, away: awayTeamName }
                      )}
                </span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className='md:w-auto py-2.5 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0'
            >
              {createMarket.isPending
                ? text('markets.creating')
                : text('markets.create')}
            </button>
          </div>
        </div>
      </AnimatedCollapse>
    </div>
  );
}
