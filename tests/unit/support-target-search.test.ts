import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSupportTarget } from '../../src/lib/support-target-search';

test('IT synonyms match a real job title, not substrings in unrelated words', () => {
  const target = {kind:'people' as const, name:'Nguyễn Văn An',code:'SDG-034',position:'Nhân viên Công nghệ thông tin',department:'Phòng Hành chính Nhân sự',departmentCode:'HCNS'};
  for (const query of ['IT','CNTT','công nghệ thông tin','SDG-034','HCNS','nguyen an']) assert(matchesSupportTarget(target,query), query);
  assert(!matchesSupportTarget({...target,position:'Digital marketing'},'IT'));
  assert(!matchesSupportTarget({...target,position:'',name:'Ibrahim Tran'},'IT'));
});
test('department initials are derived from labels and empty search browses the directory', () => {
  const target = {kind:'departments' as const,name:'Phòng Hành chính Nhân sự',code:'DEP-001'};
  assert(matchesSupportTarget(target,'HCNS')); assert(matchesSupportTarget(target,''));
  assert(!matchesSupportTarget(target,'kế toán'));
});
