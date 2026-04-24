// 실제 매장 사진을 Supabase Storage에 업로드하고 DB image_url 업데이트
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  'https://gqynptpjomcqzxyykqic.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeW5wdHBqb21jcXp4eXlrcWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1NzI3MywiZXhwIjoyMDg3MTMzMjczfQ.Gp9FOhZWFu4Mgs1YIdgEGZNV4GsMOZiPzWygLxT-1Bc'
)

const IMAGES_DIR = path.join(__dirname, '..', 'Images')
const BUCKET = 'hgm-images'

// 이미지 파일명 → 식물 이름 매핑 (실제 사진 내용 기준)
const imageMap = [
  { file: 'logo.jpg',                    dest: 'logo/logo.jpg',           type: 'logo' },
  { file: 'logo-removebg-preview.png',   dest: 'logo/logo-nobg.png',      type: 'logo' },
  { file: '5.jpg',   dest: 'products/oregano.jpg',         plantName: '오레가노' },
  { file: '6.jpg',   dest: 'products/hoya-tricolor.jpg',   plantName: '호야 트리컬러' },
  { file: '7.jpg',   dest: 'products/rosemary.jpg',        plantName: '로즈마리' },
  { file: '8.jpg',   dest: 'products/albuca-spiralis.jpg', plantName: '알부카 스피랄리스' },
  { file: '9.jpg',   dest: 'products/begonia.jpg',         plantName: '베고니아' },
  { file: '10.jpg',  dest: 'products/bougainvillea.jpg',   plantName: '부겐빌레아' },
  { file: '11.jpg',  dest: 'products/sedum-blue.jpg',      plantName: '세덤 블루빈' },
  { file: '12.jpg',  dest: 'products/geranium-coral.jpg',  plantName: '제라늄' },
  { file: '13.jpg',  dest: 'products/oxalis-yellow.jpg',   plantName: '옥살리스' },
  { file: '14.jpg',  dest: 'products/ficus.jpg',           plantName: '피쿠스' },
  { file: '15.jpg',  dest: 'products/deutzia.jpg',         plantName: '조팝나무' },
  { file: '16.jpg',  dest: 'products/spring-bulbs.jpg',    plantName: '봄 구근 모음' },
  { file: '17.jpg',  dest: 'products/mini-rose.jpg',       plantName: '미니 장미' },
  { file: '18.jpg',  dest: 'products/campanula.jpg',       plantName: '캄파눌라' },
  { file: '19.jpg',  dest: 'products/daisy.jpg',           plantName: '데이지' },
  { file: '20.jpg',  dest: 'products/cyclamen.jpg',        plantName: '시클라멘' },
  { file: '21.jpg',  dest: 'products/alyssum.jpg',         plantName: '알리섬' },
  { file: '22.jpg',  dest: 'products/kalanchoe.jpg',       plantName: '칼랑코에' },
  { file: '23.jpg',  dest: 'products/hydrangea-blue.jpg',  plantName: '수국 블루' },
  { file: '24.jpg',  dest: 'products/hydrangea-white.jpg', plantName: '수국 화이트' },
  { file: '25.jpg',  dest: 'products/gerbera.jpg',         plantName: '거베라' },
  { file: '26.jpg',  dest: 'products/lobelia.jpg',         plantName: '로벨리아' },
]

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error('버킷 생성 실패: ' + error.message)
    console.log('✅ 버킷 생성:', BUCKET)
  } else {
    console.log('✅ 버킷 확인:', BUCKET)
  }
}

async function uploadFile(file, dest) {
  const filePath = path.join(IMAGES_DIR, file)
  if (!fs.existsSync(filePath)) {
    console.warn('  ⚠️  파일 없음:', file)
    return null
  }
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(file).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg'

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(dest, buffer, { contentType: mime, upsert: true })

  if (error) {
    console.error('  ❌ 업로드 실패:', file, error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(dest)
  return data.publicUrl
}

async function updateProductImage(plantName, imageUrl) {
  const { data, error } = await supabase
    .from('hgm_products')
    .update({ image_url: imageUrl })
    .ilike('name', `%${plantName}%`)
    .select('id, name')

  if (error) { console.error('  ❌ DB 업데이트 실패:', plantName, error.message); return }
  if (data?.length) {
    data.forEach(p => console.log(`  📦 상품 업데이트: ${p.name}`))
  } else {
    // 갤러리도 시도
    const { data: gd, error: ge } = await supabase
      .from('hgm_gallery')
      .update({ image_url: imageUrl })
      .ilike('name', `%${plantName}%`)
      .select('id, name')
    if (ge) { console.error('  ❌ 갤러리 DB 실패:', plantName, ge.message); return }
    if (gd?.length) {
      gd.forEach(p => console.log(`  🖼️  갤러리 업데이트: ${p.name}`))
    } else {
      console.warn(`  ⚠️  매칭 없음: "${plantName}"`)
    }
  }
}

async function main() {
  console.log('🚀 이미지 업로드 시작\n')
  await ensureBucket()
  console.log()

  const results = {}

  for (const item of imageMap) {
    process.stdout.write(`⬆️  ${item.file} → ${item.dest} ... `)
    const url = await uploadFile(item.file, item.dest)
    if (url) {
      console.log('✅')
      results[item.file] = url
      if (item.plantName) {
        await updateProductImage(item.plantName, url)
      }
    }
  }

  // 로고 파일을 assets/logo 에도 복사
  const logoSrc = path.join(IMAGES_DIR, 'logo-removebg-preview.png')
  const logoDest = path.join(__dirname, '..', 'assets', 'logo', 'logo.png')
  if (fs.existsSync(logoSrc)) {
    fs.mkdirSync(path.dirname(logoDest), { recursive: true })
    fs.copyFileSync(logoSrc, logoDest)
    console.log('\n✅ 로고 복사 완료: assets/logo/logo.png')
  }

  console.log('\n🎉 완료!')
  console.log('\n📋 업로드된 URL 목록:')
  Object.entries(results).forEach(([f, u]) => console.log(`  ${f}: ${u}`))
}

main().catch(console.error)
