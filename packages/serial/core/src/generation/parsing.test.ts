/**
 * Tests for beat parsing utilities
 */

import { describe, it, expect } from 'vitest';

import {
  parseOutline,
  parseBeats,
  parseSimpleOutline,
  parseDetailedBeats,
  parsePipelineOutline,
  parsePipelineBeats,
} from './parsing';
import type { ExpandedBeat } from './beats';

describe('parseOutline', () => {
  it('should parse numbered list', () => {
    const text = `1. First beat
2. Second beat
3. Third beat`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(3);
    expect(beats[0].description).toBe('First beat');
    expect(beats[1].description).toBe('Second beat');
    expect(beats[2].description).toBe('Third beat');
  });

  it('should parse bullet points with dash', () => {
    const text = `- First item
- Second item
- Third item`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(3);
    expect(beats[0].description).toBe('First item');
  });

  it('should parse bullet points with asterisk', () => {
    const text = `* First item
* Second item
* Third item`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(3);
  });

  it('should handle mixed formats', () => {
    const text = `1. Numbered item
- Bullet item
* Star item
2) Paren format`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(4);
  });

  it('should assign sequential order to beats', () => {
    const text = `1. First
2. Second
3. Third`;

    const beats = parseOutline(text);

    beats.forEach((beat, index) => {
      expect(beat.order).toBe(index);
    });
  });

  it('should mark all beats as incomplete', () => {
    const text = `1. First
2. Second`;

    const beats = parseOutline(text);

    beats.forEach((beat) => {
      expect(beat.completed).toBe(false);
    });
  });

  it('should generate unique IDs for each beat', () => {
    const text = `1. First
2. Second
3. Third`;

    const beats = parseOutline(text);

    const ids = beats.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(beats.length);
  });

  it('should ignore empty lines', () => {
    const text = `1. First

2. Second

3. Third`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(3);
  });

  it('should filter by minimum description length', () => {
    const text = `1. Good beat
2. ok
3. Another good beat`;

    const beats = parseOutline(text, { minDescriptionLength: 3 });

    expect(beats).toHaveLength(2);
    expect(beats[0].description).toBe('Good beat');
    expect(beats[1].description).toBe('Another good beat');
  });

  it('should include all descriptions when minDescriptionLength is 0', () => {
    const text = `1. Good beat
2. ok
3. x`;

    const beats = parseOutline(text, { minDescriptionLength: 0 });

    expect(beats).toHaveLength(3);
  });

  it('should trim whitespace from descriptions', () => {
    const text = `1.   First with spaces
2.	Second with tabs	`;

    const beats = parseOutline(text);

    expect(beats[0].description).toBe('First with spaces');
    expect(beats[1].description).toBe('Second with tabs');
  });
});

describe('parseBeats', () => {
  it('should parse numbered beats', () => {
    const text = `1. Opening scene
2. Middle action
3. Climax`;

    const beats = parseBeats(text);

    expect(beats).toHaveLength(3);
    expect(beats[0].description).toBe('Opening scene');
    expect(beats[1].description).toBe('Middle action');
    expect(beats[2].description).toBe('Climax');
  });

  it('should extract word counts from descriptions', () => {
    const text = `1. Opening scene (~300 words)
2. Middle action (500 words)
3. Climax (~400 words)`;

    const beats = parseBeats(text);

    expect(beats[0].targetWordCount).toBe(300);
    expect(beats[1].targetWordCount).toBe(500);
    expect(beats[2].targetWordCount).toBe(400);
  });

  it('should clean word count annotations from descriptions', () => {
    const text = `1. Opening scene (~300 words)`;

    const beats = parseBeats(text);

    expect(beats[0].description).toBe('Opening scene');
  });

  it('should extract purpose markers', () => {
    const text = `1. Setup scene [setup]
2. Main action [development]
3. Big moment [climax]
4. Wind down [resolution]
5. Bridge [transition]`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats[0].purpose).toBe('setup');
    expect(beats[1].purpose).toBe('development');
    expect(beats[2].purpose).toBe('climax');
    expect(beats[3].purpose).toBe('resolution');
    expect(beats[4].purpose).toBe('transition');
  });

  it('should clean purpose markers from descriptions', () => {
    const text = `1. Setup scene [setup]`;

    const beats = parseBeats(text);

    expect(beats[0].description).toBe('Setup scene');
  });

  it('should extract tension levels from descriptions', () => {
    const text = `1. Low tension scene tension: 30
2. Building tension tension: 60
3. High tension moment tension: 90`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats[0].tensionLevel).toBe(30);
    expect(beats[1].tensionLevel).toBe(60);
    expect(beats[2].tensionLevel).toBe(90);
  });

  it('should extract sub-properties', () => {
    const text = `1. Opening scene (~300 words)
   - Characters: Elena, Marcus
   - Location: Temple entrance
   - Tone: curious, apprehensive
   - POV: Elena
   - Tension: 45`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats[0].charactersInvolved).toEqual(['Elena', 'Marcus']);
    expect(beats[0].location).toBe('Temple entrance');
    expect(beats[0].emotionalTone).toBe('curious, apprehensive');
    expect(beats[0].povCharacter).toBe('Elena');
    expect(beats[0].tensionLevel).toBe(45);
  });

  it('should handle singular "character" property', () => {
    const text = `1. Solo scene
   - Character: Elena`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats[0].charactersInvolved).toEqual(['Elena']);
  });

  it('should distribute word counts evenly when none extracted', () => {
    const text = `1. First beat
2. Second beat
3. Third beat`;

    const beats = parseBeats(text, { targetWordCount: 1200, distributeWordCounts: true });

    expect(beats[0].targetWordCount).toBe(400);
    expect(beats[1].targetWordCount).toBe(400);
    expect(beats[2].targetWordCount).toBe(400);
  });

  it('should not distribute word counts when distributeWordCounts is false', () => {
    const text = `1. First beat
2. Second beat`;

    const beats = parseBeats(text, { targetWordCount: 1000, distributeWordCounts: false });

    expect(beats[0].targetWordCount).toBeUndefined();
    expect(beats[1].targetWordCount).toBeUndefined();
  });

  it('should skip metadata extraction when disabled', () => {
    const text = `1. Opening scene (~300 words) [setup] tension: 50
   - Characters: Elena`;

    const beats = parseBeats(text, {
      extractWordCounts: false,
      extractPurpose: false,
      extractTension: false,
      extractSubProperties: false,
      distributeWordCounts: false,
    }) as ExpandedBeat[];

    expect(beats[0].targetWordCount).toBeUndefined();
    expect(beats[0].purpose).toBeUndefined();
    expect(beats[0].tensionLevel).toBeUndefined();
    expect(beats[0].charactersInvolved).toBeUndefined();
    // Description should still contain annotations since they weren't extracted
    expect(beats[0].description).toContain('~300 words');
  });

  it('should handle multiple beats with sub-properties', () => {
    const text = `1. First scene
   - Location: Room A

2. Second scene
   - Location: Room B

3. Third scene
   - Location: Room C`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats).toHaveLength(3);
    expect(beats[0].location).toBe('Room A');
    expect(beats[1].location).toBe('Room B');
    expect(beats[2].location).toBe('Room C');
  });
});

describe('parseSimpleOutline', () => {
  it('should use minDescriptionLength of 3', () => {
    const text = `1. Good beat
2. ok
3. Another good beat`;

    const beats = parseSimpleOutline(text);

    expect(beats).toHaveLength(2);
    expect(beats[0].description).toBe('Good beat');
    expect(beats[1].description).toBe('Another good beat');
  });

  it('should handle bullet points', () => {
    const text = `- The hero enters
- A challenge appears
* Resolution of conflict`;

    const beats = parseSimpleOutline(text);

    expect(beats).toHaveLength(3);
    expect(beats[0].description).toBe('The hero enters');
  });
});

describe('parseDetailedBeats', () => {
  it('should extract full metadata', () => {
    const text = `1. Opening scene (~300 words) [setup]
   - Characters: Elena
   - Location: Temple
   - Tension: 40`;

    const beats = parseDetailedBeats(text);

    expect(beats[0].targetWordCount).toBe(300);
    expect(beats[0].purpose).toBe('setup');
    expect(beats[0].charactersInvolved).toEqual(['Elena']);
    expect(beats[0].location).toBe('Temple');
    expect(beats[0].tensionLevel).toBe(40);
  });

  it('should distribute word counts evenly when not specified', () => {
    const text = `1. First beat
2. Second beat`;

    const beats = parseDetailedBeats(text, 1000);

    expect(beats[0].targetWordCount).toBe(500);
    expect(beats[1].targetWordCount).toBe(500);
  });
});

describe('parsePipelineOutline', () => {
  it('should include all descriptions (no minimum length)', () => {
    const text = `1. Good beat
2. ok
3. x`;

    const beats = parsePipelineOutline(text);

    expect(beats).toHaveLength(3);
  });

  it('should handle mixed formats', () => {
    const text = `1. The hero enters the cave
2. Discovery of ancient treasure
- Meets the dragon guardian
* Final confrontation`;

    const beats = parsePipelineOutline(text);

    expect(beats).toHaveLength(4);
    expect(beats[0].description).toBe('The hero enters the cave');
    expect(beats[1].description).toBe('Discovery of ancient treasure');
    expect(beats[2].description).toBe('Meets the dragon guardian');
    expect(beats[3].description).toBe('Final confrontation');
  });
});

describe('parsePipelineBeats', () => {
  it('should extract only word counts', () => {
    const text = `1. Opening scene (~300 words) [setup]
   - Characters: Elena
   - Tension: 50

2. Middle action (500 words) [development]
   - Location: Temple`;

    const beats = parsePipelineBeats(text);

    expect(beats).toHaveLength(2);
    expect(beats[0].targetWordCount).toBe(300);
    expect(beats[1].targetWordCount).toBe(500);
    // Should not have extracted these
    expect((beats[0] as ExpandedBeat).purpose).toBeUndefined();
    expect((beats[0] as ExpandedBeat).charactersInvolved).toBeUndefined();
    expect((beats[0] as ExpandedBeat).tensionLevel).toBeUndefined();
    expect((beats[1] as ExpandedBeat).location).toBeUndefined();
  });

  it('should not distribute word counts', () => {
    const text = `1. First beat
2. Second beat`;

    const beats = parsePipelineBeats(text);

    expect(beats[0].targetWordCount).toBeUndefined();
    expect(beats[1].targetWordCount).toBeUndefined();
  });

  it('should clean word count annotations from descriptions', () => {
    const text = `1. Opening scene with protagonist (~300 words)`;

    const beats = parsePipelineBeats(text);

    expect(beats[0].description).toBe('Opening scene with protagonist');
  });
});

describe('edge cases', () => {
  it('should handle empty input', () => {
    expect(parseOutline('')).toEqual([]);
    expect(parseBeats('')).toEqual([]);
    expect(parseSimpleOutline('')).toEqual([]);
    expect(parseDetailedBeats('')).toEqual([]);
    expect(parsePipelineOutline('')).toEqual([]);
    expect(parsePipelineBeats('')).toEqual([]);
  });

  it('should handle input with no list items', () => {
    const text = `This is just some text
without any list items
or structure.`;

    expect(parseOutline(text)).toEqual([]);
    expect(parseBeats(text)).toEqual([]);
  });

  it('should handle single beat', () => {
    const text = `1. Only one beat`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(1);
    expect(beats[0].description).toBe('Only one beat');
    expect(beats[0].order).toBe(0);
  });

  it('should handle complex descriptions with special characters', () => {
    const text = `1. Elena's discovery - the artifact (magical) shines!
2. "What is this?" - she asks
3. The answer: it's a key`;

    const beats = parseOutline(text);

    expect(beats).toHaveLength(3);
    expect(beats[0].description).toBe("Elena's discovery - the artifact (magical) shines!");
    expect(beats[1].description).toBe('"What is this?" - she asks');
    expect(beats[2].description).toBe("The answer: it's a key");
  });

  it('should handle descriptions with embedded parentheses (not word counts)', () => {
    const text = `1. The discovery (not the artifact) happens`;

    // Use distributeWordCounts: false so we can verify the regex didn't match
    const beats = parseBeats(text, { distributeWordCounts: false });

    expect(beats[0].description).toBe('The discovery (not the artifact) happens');
    expect(beats[0].targetWordCount).toBeUndefined();
  });

  it('should handle case-insensitive purpose markers', () => {
    const text = `1. Scene [SETUP]
2. Scene [Climax]
3. Scene [DEVELOPMENT]`;

    const beats = parseBeats(text) as ExpandedBeat[];

    expect(beats[0].purpose).toBe('setup');
    expect(beats[1].purpose).toBe('climax');
    expect(beats[2].purpose).toBe('development');
  });

  it('should handle case-insensitive word counts', () => {
    const text = `1. Scene (~300 WORDS)
2. Scene (500 Words)`;

    const beats = parseBeats(text);

    expect(beats[0].targetWordCount).toBe(300);
    expect(beats[1].targetWordCount).toBe(500);
  });
});
